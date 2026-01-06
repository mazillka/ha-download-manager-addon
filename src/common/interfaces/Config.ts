import {ConfigKey} from "../enums";

export default interface Config {
  key: ConfigKey;
  value: string;
  description: string;
}
