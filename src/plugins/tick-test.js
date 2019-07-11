export default class TickTest {
  async tick(server, next) {
    console.log('Tick...');
    await next();
    console.log('Tock.');
  }
}
