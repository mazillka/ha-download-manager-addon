import { initDB } from "../database";

export const Initialize = async (): Promise<void> => {
  initDB();
};

export default { Initialize };
