import { initDB } from "../database";
import { db } from "../database/connection";

export const Initialize = async (): Promise<void> => {
  initDB();
};

export const Close = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

export default { Initialize, Close };
