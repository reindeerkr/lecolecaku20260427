import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firestore-errors';

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection successful");
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'test/connection');
  }
}
