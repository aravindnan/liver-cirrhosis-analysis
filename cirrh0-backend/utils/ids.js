const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Record ids are UUIDs. Check before querying so a malformed id is a clean 404, not a database error.
const isUuid = (value) => typeof value === "string" && UUID.test(value);

module.exports = { isUuid };
