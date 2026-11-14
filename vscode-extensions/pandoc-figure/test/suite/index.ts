import Mocha from "mocha";

export function run(): Promise<void> {
  const mocha = new Mocha({ ui: "bdd", timeout: 60000, color: true });
  mocha.suite.emit("pre-require", globalThis, "suite", mocha);
  require("./figure.test");
  return new Promise((resolve, reject) => mocha.run((failures) => (failures ? reject(new Error(`${failures} tests failed`)) : resolve())));
}
