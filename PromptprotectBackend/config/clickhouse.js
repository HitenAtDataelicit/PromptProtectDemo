// config/clickhouse.js
const { createClient } = require("@clickhouse/client");

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_URL,
  database: process.env.CLICKHOUSE_DATABASE,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
  compression: {
    response: true,
    request: true,
  },
});

module.exports = { clickhouse };