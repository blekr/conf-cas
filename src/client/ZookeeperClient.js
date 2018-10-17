/* eslint-disable import/prefer-default-export */
import zookeeper from 'node-zookeeper-client';

export class ZookeeperClient {
  constructor({ host, port }) {
    this.host = host;
    this.port = port;
    this.client = null;
  }

  connect() {
    this.client = zookeeper.createClient(`${this.host}:${this.port}`, {
      sessionTimeout: 8000,
      retries: 3,
    });
    return new Promise((resolve, reject) => {
      this.client.once('connected', resolve);
      this.client.once('disconnected', reject);
      this.client.connect();
    });
  }

  // create path of type CreateMode.PERSISTENT if not exists, otherwise no effect
  makeDir(path) {
    return new Promise((resolve, reject) => {
      this.client.mkdirp(path, error => {
        if (error && error.getCode() !== zookeeper.Exception.NODE_EXISTS) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  createNode({ path, mode, data }) {
    return new Promise((resolve, reject) => {
      this.client.create(path, data, mode, (error, createdPath) => {
        if (error) {
          reject(error);
        } else {
          resolve(createdPath);
        }
      });
    });
  }

  listenChildren({ path, onChildren, onError }) {
    const getChildren = () => {
      this.client.getChildren(
        path,
        event => {
          if (event.getType() === zookeeper.Event.NODE_CHILDREN_CHANGED) {
            getChildren();
          }
        },
        (error, children) => {
          if (error) {
            onError(error);
          } else {
            onChildren(children);
          }
        },
      );
    };
    getChildren();
  }

  close() {
    this.client.close();
  }
}
