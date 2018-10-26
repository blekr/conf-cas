function parseCASs(casStr) {
  const casList = casStr.split(',');
  return casList.map(cas => {
    const items = cas.split(':');
    return {
      host: items[0],
      port: items[1],
    };
  });
}

export default {
  internalKey: 'NzlhYzMwNmYxYjQ1N2U2OTI2MDdlNjc0',
  casList: process.env.CAS ? parseCASs(process.env.CAS) : [],
  casLicense: 'WAOERZB5G9',
  confServer: {
    host: process.env.CONF_SERVER_HOST,
    port: process.env.CONF_SERVER_PORT,
  },
  zookeeper: {
    host: process.env.ZOOKEEPER_HOST,
    port: process.env.ZOOKEEPER_PORT,
    root: process.env.ZOOKEEPER_ROOT,
  },
};
