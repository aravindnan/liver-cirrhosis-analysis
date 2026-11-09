const { db } = require("../../db/client");

// Prisma model objects are proxies, so node's mock.method cannot see their methods. Instead the whole
// model object is swapped for a plain one holding the stubs, and put back when the test ends.
const stubModel = (t, model, methods) => {
  const original = Object.getOwnPropertyDescriptor(db, model);
  Object.defineProperty(db, model, { value: { ...methods }, configurable: true, writable: true, enumerable: true });
  t.after(() => Object.defineProperty(db, model, original));
};

// Same for a method on the client itself, such as $queryRaw.
const stubClientMethod = (t, name, impl) => {
  const original = Object.getOwnPropertyDescriptor(db, name);
  Object.defineProperty(db, name, { value: impl, configurable: true, writable: true, enumerable: true });
  t.after(() => (original ? Object.defineProperty(db, name, original) : delete db[name]));
};

module.exports = { stubModel, stubClientMethod };
