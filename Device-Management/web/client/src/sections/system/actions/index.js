import author from "./author";
import log from "./log";
import company from "./company";
import role from "./role";
import member from "./member";
import project from "./project";

export default {
  ...author,
  ...log,
  ...company,
  ...role,
  ...member,
  ...project,
};
