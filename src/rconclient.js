// Test Version of RCON client. Maybe changed at a future date.
import Rcon from '@thomas-smyth/rcon';

/**
 * Squad RCON client built upon '@thomas-smyth/rcon'.
 */
export default class RconClient {
  /**
   * Create a RCON client instance to use to query the server.
   *
   * @param {String} host
   * @param {Integer} port
   * @param {String} password
   */
  constructor(host, port, password) {
    if (host) this.host = host;
    else throw new Error('RconClient must have a host!');

    if (port) this.port = port;
    else throw new Error('RconClient must have a rcon port!');

    if (password) this.password = password;
    else throw new Error('RconClient must have a rcon password!');

    // Creates instance of '@thomas-smyth/rcon' to query server.
    this.rcon = new Rcon({ host: this.host, port: this.port });
  }

  /**
   * Execute an RCON command.
   *
   * @param command
   * @returns {Promise<*|void>}
   */
  async execute(command) {
    try {
      await this.rcon.connect();
      await this.rcon.authenticate(this.password);
      let response = await this.rcon.execute(command);
      await this.rcon.disconnect();
      return response;
    } catch (err) {
      console.log(`Failed to execute command: ${command}`);
    }
  }

  /**
   * Find out the current and next layers.
   *
   * @returns {Promise<{currentLayer: any, nextLayer: any}>}
   */
  async getCurrentAndNextLayer() {
    let response = await this.execute('ShowNextMap');

    response = response
      .replace('Current map is ', '')
      .replace(' Next map is ', '')
      .split(',');

    return {
      currentLayer: response[0] !== '' ? response[0] : undefined,
      nextLayer: response[1] !== '' ? response[1] : undefined
    };
  }

  /**
   * Set the current layer.
   *
   * @param {String} layer
   * @returns {Promise<void>}
   */
  async changeLayer(layer) {
    await this.execute(`AdminChangeMap ${layer}`);
  }

  /**
   * Set the next layer.
   *
   * @param {String} layer
   * @returns {Promise<void>}
   */
  async setNextLayer(layer) {
    await this.execute(`AdminSetNextMap ${layer}`);
  }

  /**
   * Make an announcement on the server.
   *
   * @param {String} message
   * @returns {Promise<void>}
   */
  async makeAnnouncement(message) {
    await this.execute(`AdminBroadcast ${message}`);
  }
}
