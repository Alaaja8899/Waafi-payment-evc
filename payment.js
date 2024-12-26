require('dotenv').config();


// Fiiri comments ka hoose ee functionka preauthorizeAndCommit ku jira

// keys loaded from .env file
const MerchantUid = process.env.MERCHANT_UID;
const ApiUserId = process.env.API_USER_ID;
const ApiKey = process.env.API_KEY;


const baseURL = "https://api.waafipay.net/asm";


// success status code: 2001


async function preauthorizeAndCommit(phone, plan) {
  try {

    const preauthorizeBody = {
          schemaVersion: "1.0",
          requestId: "unique_requestid",
          timestamp: "client_timestamp",
          channelName: "WEB",
          serviceName: "API_PREAUTHORIZE",
          serviceParams: {
              merchantUid: MerchantUid,
              apiUserId: ApiUserId,
              apiKey: ApiKey,
              paymentMethod: "MWALLET_ACCOUNT",
              payerInfo: {
                  accountNo: `252${phone}`
              },
              transactionInfo: {
                  referenceId: "unique",
                  invoiceId: "INV99222213",
                  amount: `${plan}`,
                  currency: "USD",
                  description: "test preauth"
              }
          }
      };


      //waxaa timoutka u isticmaalay in sugo 1 min balse server wuxuu responsiga soo dhiibaa 30s
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60 seconds 


    //   responseigaan wuxuu kusoo jawaabaa 30s qofka mobilka aqbalada haduu kadaaho 
    //   response dhan masoo dhacaayo 
      let preauthorizeResponse;
      try {
          preauthorizeResponse = await fetch(baseURL, {
              method: "POST",
              headers: {
                  "Content-Type": "application/json"
              },
              body: JSON.stringify(preauthorizeBody),
              signal: controller.signal
          });
      } finally {
          clearTimeout(timeout); 
      }

      const preauthorizeResult = await preauthorizeResponse.json();

      if (preauthorizeResult.responseCode !== "2001") {
          return {
              success: false,
              message: preauthorizeResult.responseMsg
          };
      }

      console.log("Preauthorize successful:", preauthorizeResult);

      const transactionId = preauthorizeResult.params.transactionId;

      const commitBody = {
          schemaVersion: "1.0",
          requestId: "unique_requestid",
          timestamp: "client_timestamp",
          channelName: "WEB",
          serviceName: "API_PREAUTHORIZE_COMMIT",
          serviceParams: {
              merchantUid: MerchantUid,
              apiUserId: ApiUserId,
              apiKey: ApiKey,
              paymentMethod: "MWALLET_ACCOUNT",
              transactionId: transactionId,
              description: "PREAUTH Committed"
          }
      };

      const commitResponse = await fetch(baseURL, {
          method: "POST",
          headers: {
              "Content-Type": "application/json"
          },
          body: JSON.stringify(commitBody)
      });

      const commitResult = await commitResponse.json();

      if (commitResult.responseCode !== "2001") {
          console.error("Commit failed:", commitResult);
          return {
              success: false,
              message: "Commit failed"
          };
      }

      return {
          success: true,
          message: "Successfully payment completed!"
      };

  } catch (error) {
      if (error.name === 'AbortError') {
          console.error("Preauthorize request timed out");
          return {
              success: false,
              message: "Request timed out"
          };
      }
    //   console.error("Error during payment workflow:", error);
      return {
          success: false,
          message: "An unexpected error occurred"
      };
  }
}


const phone = "252611430930"; // Phone number of the payer
const plan = 0.5; // Amount to be paid

preauthorizeAndCommit(phone , plan).then(result => {
  console.log(result);
});