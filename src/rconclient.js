// Test Version of RCON client. Maybe changed at a future date.
import Rcon from '@thomas-smyth/rcon';

export default class RconClient {
  constructor(host, port, password) {
    if (host) this.host = host;
    else throw new Error('RconClient must have a host!');

    if (port) this.port = port;
    else throw new Error('RconClient must have a rcon port!');

    if (password) this.password = password;
    else throw new Error('RconClient must have a rcon password!');

    this.rcon = new Rcon({ host: this.host, port: this.port });
  }

  async execute(command) {
    await this.rcon.connect();
    await this.rcon.authenticate(this.password);
    let response = await this.rcon.execute(command);
    await this.rcon.disconnect();
    return response;
  }

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

  async changeLayer(layer) {
    await this.execute(`AdminChangeMap ${layer}`);
  }

  async setNextLayer(layer) {
    await this.execute(`AdminSetNextMap ${layer}`);
  }

  async makeAnnouncement(message) {
    await this.execute(`AdminBroadcast ${message}`);
  }
}
