const { EventHubClient } = require('azure-event-hubs');
 
const client = EventHubClient.createFromConnectionString('Endpoint=sb://iothub-ns-testiot632-452165-1822bc9b1c.servicebus.windows.net/;SharedAccessKeyName=iothubowner;SharedAccessKey=s5JVWGQOQRcK+WHLMyrJ5BvM3CMMcs7nRX8XmhkNaD8=', 'testiot6324');
 
async function main() {
  const partitionIds = await client.getPartitionIds();
}
 
main().catch((err) => {
  console.log(err);
});