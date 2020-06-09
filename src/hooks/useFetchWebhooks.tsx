import gql from 'graphql-tag';
import { WEBHOOK_FRAGMENT } from 'schema/fragments';
import { WebhookConnection, Webhook } from 'schema/types';
import { useQuery } from '@apollo/react-hooks';

const GET_WEBHOOKS = gql`
  query getWebhooks($endpointId: ID!, $after: Int) {
    webhooks(endpointId: $endpointId, after: $after)
      @connection(key: "webhooks", filter: ["endpointId"]) {
      nodes {
        ...webhook
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
  ${WEBHOOK_FRAGMENT}
`;

const WEBHOOK_CREATED = gql`
  subscription webhookCreated($endpointId: ID!) {
    webhookCreated(endpointId: $endpointId) {
      webhook {
        ...webhook
      }
    }
  }
  ${WEBHOOK_FRAGMENT}
`;

export interface WebhooksPayload {
  webhooks: WebhookConnection;
}

const useFetchWebhooks = (endpointId: string) => {
  const {
    data,
    loading,
    error,
    refetch,
    fetchMore,
    subscribeToMore,
  } = useQuery<WebhooksPayload>(GET_WEBHOOKS, {
    variables: {
      endpointId,
    },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: 'cache-and-network',
  });

  const loadMore = () => {
    if (loading) return;
    if (!data?.webhooks.pageInfo.hasNextPage) return;

    return fetchMore({
      variables: {
        after: data?.webhooks.pageInfo.endCursor,
      },
      // @ts-ignore: No overload matches this call error. Can't seem to to get around this error: https://github.com/apollographql/react-apollo/issues/2443#issuecomment-624971593
      updateQuery: (
        previousResult,
        { fetchMoreResult }: { fetchMoreResult: WebhooksPayload },
      ) => ({
        ...previousResult,
        webhooks: {
          ...previousResult.webhooks,
          pageInfo: {
            ...previousResult.webhooks.pageInfo,
            endCursor: fetchMoreResult?.webhooks.pageInfo.endCursor,
            hasNextPage:
              fetchMoreResult?.webhooks.pageInfo.hasNextPage,
          },
          nodes: [
            ...previousResult.webhooks.nodes,
            ...fetchMoreResult.webhooks.nodes,
          ],
        },
      }),
    }).catch(() => {}); // Unless we catch, a network error will cause an unhandled rejection: https://github.com/apollographql/apollo-client/issues/3963;
  };

  subscribeToMore({
    document: WEBHOOK_CREATED,
    variables: {
      endpointId,
    },
    updateQuery: (
      previousResult,
      {
        subscriptionData,
      }: {
        subscriptionData: {
          data: { webhookCreated: { webhook: Webhook } };
        };
      },
    ) => {
      if (!previousResult || !subscriptionData.data)
        return previousResult;

      const webhook = subscriptionData.data.webhookCreated.webhook;
      if (
        previousResult.webhooks.nodes.some(w => w.id === webhook.id)
      )
        return previousResult;
      else
        return {
          ...previousResult,
          webhooks: {
            ...previousResult.webhooks,
            nodes: [webhook, ...previousResult.webhooks.nodes],
          },
        };
    },
  });

  return {
    webhooks: data?.webhooks.nodes ?? [],
    hasNextPage: !!data?.webhooks.pageInfo.hasNextPage,
    loading,
    error,
    refetch,
    loadMore,
  };
};

export default useFetchWebhooks;
