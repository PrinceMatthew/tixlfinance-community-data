import fs from "fs";
import dotenv from "dotenv";
import { Headers } from "cross-fetch";
import { GraphQLClient, gql } from "graphql-request";
import path from "path";
import { calcScore } from "../score/calculation";

dotenv.config();
global.Headers = global.Headers || Headers;

const endpoint = process.env.MAIN_API_ENDPOINT as string;
if (!endpoint) {
  throw new Error("API endpoint invalid");
}

const graphQLClient = new GraphQLClient(endpoint);
graphQLClient.setHeaders({
  authorization: `Bearer ${process.env.API_ASSETS_KEY}`,
});

async function calcScoresAndGenerateCsv() {
  const projectsPath = path.join(__dirname, "./../projects");

  // print the CSV header line
  console.log(
    "volume_score;real_liquidity_score;exchanges_score;supply_score;sentiment_score;total_score"
  );

  fs.readdir(projectsPath, async (err, dirNames) => {
    if (err) {
      throw err;
    }

    for (const dirName of dirNames) {
      if (dirName.startsWith(".")) {
        continue;
      }

      const assetQuery = gql`
        query {assetByAssetId(asset_id: "${dirName}") {
          asset_id,
          exchanges_data {
            _id,
            pair,
            quality_score
          }, 
          id,
          market_cap_usd,
          tokenomics {
            circulating_supply,
            total_supply
          },
          volume_24h_usd
        }}
      `;

      const assetResponse = await graphQLClient.request(assetQuery);
      const score = calcScore(assetResponse.assetByAssetId);
      console.log(
        `${score.volume_score};${score.real_liquidity_score};${score.exchanges_score};${score.supply_score};${score.sentiment_score};${score.total_score}`
      );
    }
  });
}

calcScoresAndGenerateCsv().then(() => null);
