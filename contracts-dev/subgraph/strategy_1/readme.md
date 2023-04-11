# Subgraph of Bolide Strategy

## Deployment

1. Create .env file and fill it with next variables:
- STORAGE_START_BLOCK=<some_block_number>
- STORAGE_ADDRESS='"<some_address>"'

2. Run the `npm run build` command to build the subgraph, and check compilation errors before deploying.

3. Run `graph auth --product hosted-service <ACCESS_TOKEN>`

4. Deploy via `npm run deploy -- <GITHUB_USER>/<SUBGRAPH NAME>`.


## If change Storage contract
In file `subgraph.yaml` change `dataSources/source/address` to new address of Strorage and execute deployment
