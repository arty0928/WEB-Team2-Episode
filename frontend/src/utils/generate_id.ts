import { v7 as uuidv7 } from "uuid";

const generateId = () => {
    return uuidv7();
};

export default generateId;
