// Some Windows Node installations intermittently fail os.userInfo() with
// uv_os_get_passwd ENOMEM. drizzle-kit/tsx only needs a stable temp suffix.
const os = require("node:os");
const original = os.userInfo;
os.userInfo = (...args) => {
  try { return original(...args); }
  catch { return { uid: -1, gid: -1, username: process.env.USERNAME || "gowayy", homedir: process.env.USERPROFILE || os.tmpdir(), shell: null }; }
};
