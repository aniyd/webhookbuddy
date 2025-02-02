import * as functions from 'firebase-functions';
import { admin, db } from '../config/firebase';

export const onWebhookWrite = functions.firestore
  .document('endpoints/{endpointId}/webhooks/{webhookId}')
  .onWrite((change, context) => {
    const endpointRef = db.doc(
      `endpoints/${context.params.endpointId}`,
    );

    // Inspired by: https://stackoverflow.com/a/49407570/188740

    if (!change.before.exists)
      return endpointRef.set(
        {
          webhookCount: admin.firestore.FieldValue.increment(1),
        },
        { merge: true },
      );

    if (!change.after.exists) {
      return endpointRef.set(
        {
          webhookCount: admin.firestore.FieldValue.increment(-1),
        },
        { merge: true },
      );
    }

    return null;
  });
