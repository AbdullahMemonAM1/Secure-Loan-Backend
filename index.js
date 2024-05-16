// index.js

const express = require("express");
const { Web3 } = require("web3");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const port = 3002;
//api key alchemy = _Le7Y2PcwnqFwRzUpPv-u74w9oGZujXY

const web3 = new Web3(
  "https://eth-sepolia.g.alchemy.com/v2/_Le7Y2PcwnqFwRzUpPv-u74w9oGZujXY"
); // Replace with the RPC URL of your local node
//0x79c650Fc8Af78411D2cE03B73332bf291A1FA510
const lenderContractABI = require("./abi_lender_packages.json"); // ABI of your smart contract
const contractAddressLender = "0x7Dbd74b7b487c0E1341D6743C54bD8A5c4c03A99"; // Address of your smart contract
const contract_lender = new web3.eth.Contract(
  lenderContractABI,
  contractAddressLender
);

const borrowerContractABI = require("./abi_custom_packages.json"); // ABI of your smart contract
const contractAddressBorrower = "0x189f8828Aa06B3B3FdB288D94956ED8A1e33e4E3"; // Address of your smart contract
const contract_borrower = new web3.eth.Contract(
  borrowerContractABI,
  contractAddressBorrower
);

const authContractABI = require("./abi_auth.json"); // ABI of your smart contract
const contractAddressAuth = "0xE297247210B0416A3BC72e49730aC24D33838C28"; // Address of your smart contract
const contract_Auth = new web3.eth.Contract(
  authContractABI,
  contractAddressAuth
);

app.use(cors());
app.use(express.json());

//wss://eth-sepolia.g.alchemy.com/v2/_Le7Y2PcwnqFwRzUpPv-u74w9oGZujXY

const NODE_URL =
  "wss://eth-sepolia.g.alchemy.com/v2/_Le7Y2PcwnqFwRzUpPv-u74w9oGZujXY";
const subWeb3 = new Web3(NODE_URL);
const logsFilter = {
  address: "0x7Dbd74b7b487c0E1341D6743C54bD8A5c4c03A99", // WETH contract address
};

const MONGO_URI =
  "mongodb+srv://ethqasim:qasim123@cluster0.pmab2by.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Check connection
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => console.log("Connected to MongoDB Atlas"));

const notificationSchema = new mongoose.Schema({
  event: {
    type: String,
    required: true,
  },
  performedBy: {
    type: String,
    required: true,
  },
});

const walletSchema = new mongoose.Schema({
  walletId: {
    type: String,
    required: true,
    unique: true,
  },
  notifications: [notificationSchema],
});

const WalletNotification = mongoose.model(
  "WalletNotification",
  notificationSchema
);
const Wallet = mongoose.model("Wallet", walletSchema);

const BorrowerHistorySchema = new mongoose.Schema({
  wallet: { type: String, required: true },
  packageIDs: [{ type: Number }], // Array to store package IDs
});

const BorrowerHistory = mongoose.model(
  "BorrowerHistory",
  BorrowerHistorySchema
);

async function subscribeToLogs() {
  try {
    // Create a new subscription to logs with the specified filter
    const subscription = await subWeb3.eth.subscribe("logs", logsFilter);

    console.log(`Subscription created with ID: ${subscription.id}`);

    // Attach event listeners to the subscription object for 'data' and 'error'
    subscription.on("data", handleLogs);
    subscription.on("error", handleError);
  } catch (error) {
    console.error(`Error subscribing to new logs: ${error}`);
  }
}

// Event listener that logs the received log data
function handleLogs(log) {
  try {
    const eventSignatureLoanPackageStatusChanged =
      web3.eth.abi.encodeEventSignature({
        type: "event",
        name: "LoanPackageStatusChanged",
        inputs: [
          { type: "uint256", name: "packageId", indexed: true },
          { type: "bool", name: "isActive", indexed: false },
        ],
      });

    console.log(
      "Event Signature for LoanPackageStatusChanged:",
      eventSignatureLoanPackageStatusChanged
    );

    // Event signature for LoanPackageCreated
    const eventSignatureLoanPackageCreated = web3.eth.abi.encodeEventSignature({
      type: "event",
      name: "LoanPackageCreated",
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "id",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "address",
          name: "packageOwner",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "bankAmount",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "loanAmount",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "interest",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "timeToReturn",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "string",
          name: "description",
          type: "string",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "penaltyRate",
          type: "uint256",
        },
      ],
    });

    console.log(
      "Event Signature for LoanPackageCreated:",
      eventSignatureLoanPackageCreated
    );

    // Event signature for LoanBorrowed
    const eventSignatureLoanBorrowed = web3.eth.abi.encodeEventSignature({
      type: "event",
      name: "LoanBorrowed",
      inputs: [
        { type: "uint256", name: "packageId", indexed: true },
        { type: "address", name: "borrower", indexed: true },
        { type: "uint256", name: "loanAmount", indexed: false },
      ],
    });

    console.log(
      "Event Signature for LoanBorrowed:",
      eventSignatureLoanBorrowed
    );

    // Event signature for LoanRepaid
    const eventSignatureLoanRepaid = web3.eth.abi.encodeEventSignature({
      type: "event",
      name: "LoanRepaid",
      inputs: [
        { type: "uint256", name: "packageId", indexed: true },
        { type: "address", name: "borrower", indexed: true },
        { type: "uint256", name: "repaidAmount", indexed: false },
      ],
    });
    console.log("YOOOO");

    console.log("Event Signature for LoanRepaid:", eventSignatureLoanRepaid);
    if (log.topics[0] === eventSignatureLoanPackageCreated) {
      var decodedLog = subWeb3.eth.abi.decodeLog(
        [
          {
            indexed: true,
            internalType: "uint256",
            name: "id",
            type: "uint256",
          },
          {
            indexed: true,
            internalType: "address",
            name: "packageOwner",
            type: "address",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "bankAmount",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "loanAmount",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "interest",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "timeToReturn",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "string",
            name: "description",
            type: "string",
          },
        ],
        log["data"],
        log["topics"]
      );

      var logData = JSON.parse(
        JSON.stringify(
          decodedLog,
          (key, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
        )
      );
      console.log("New log received:", log);
      const newNotification = new WalletNotification({
        event: "LoanPackageCreated",
        performedBy: logData.packageOwner.toString().toLowerCase(), // Assuming the package owner is the one who performed the event
      });

      // Save the new notification to MongoDB
      newNotification
        .save()
        .then(() => {
          console.log("Notification saved successfully.");
        })
        .catch((error) => {
          console.error("Error saving notification:", error);
        });

      console.log(
        "New decoded log received:",
        JSON.parse(
          JSON.stringify(
            decodedLog,
            (key, value) =>
              typeof value === "bigint" ? value.toString() : value // return everything else unchanged
          )
        )
      );
    } else if (log.topics[0] === eventSignatureLoanBorrowed) {
      console.log("Log corresponds to event: LoanBorrowed");
      var decodedLog = subWeb3.eth.abi.decodeLog(
        [
          {
            indexed: true,
            internalType: "uint256",
            name: "packageId",
            type: "uint256",
          },
          {
            indexed: true,
            internalType: "address",
            name: "borrower",
            type: "address",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "loanAmount",
            type: "uint256",
          },
        ],
        log["data"],
        log["topics"]
      );
      var logData = JSON.parse(
        JSON.stringify(
          decodedLog,
          (key, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
        )
      );
      console.log("New decoded log received:", logData);
      BorrowerHistory.findOneAndUpdate(
        { wallet: logData.borrower.toString().toLowerCase() },
        { $push: { packageIDs: logData.packageId } },
        { new: true, upsert: true }
      )
        .then((doc) => {
          if (doc) {
            console.log("Package ID added:", doc);
          } else {
            console.log("No wallet found with ID:", walletId);
          }
        })
        .catch((err) => {
          console.error("Error adding package ID:", err);
        });
      // Decode the log data for LoanBorrowed event
    } else if (log.topics[0] === eventSignatureLoanRepaid) {
      var decodedLog = subWeb3.eth.abi.decodeLog(
        [
          {
            indexed: true,
            internalType: "uint256",
            name: "packageId",
            type: "uint256",
          },
          {
            indexed: true,
            internalType: "address",
            name: "borrower",
            type: "address",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "repaidAmount",
            type: "uint256",
          },
        ],
        log["data"],
        log["topics"]
      );
      console.log("New log received:", log);
      console.log("REPAIDDD");
      var logData = JSON.parse(
        JSON.stringify(
          decodedLog,
          (key, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
        )
      );
      const newNotification = new WalletNotification({
        event: "LoanRepaid",
        performedBy: logData.borrower.toString().toLowerCase(), // Assuming the package owner is the one who performed the event
      });

      // Save the new notification to MongoDB
      newNotification
        .save()
        .then(() => {
          console.log("Notification saved successfully.");
        })
        .catch((error) => {
          console.error("Error saving notification:", error);
        });

      console.log("Log corresponds to event: LoanRepaid");
      // Decode the log data for LoanRepaid event
    } else {
      console.log("Log does not correspond to any known event");
    }
  } catch (error) {
    console.error("Error handling log:", error);
    console.error("Raw log data:", log);
  }
}

// Event listener that logs any errors that occur
function handleError(error) {
  console.error("Error when subscribing to new logs:", error);
}

app.get("/user/profile/:parameter", async (req, res) => {
  try {
    // Call the desired function of the smart contract
    const { parameter } = req.params;

    const result = await contract_Auth.methods.getUserInfo(parameter).call();
    for (const key in result) {
      if (typeof result[key] === "bigint") {
        result[key] = parseInt(result[key]);
      }
    }
    // Loop based on the retrieved packageCount

    res.json({ result });
  } catch (error) {
    console.error("Error calling smart contract function:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/packages/borrower/search", async (req, res) => {
  try {
    const { searchType, searchValue, role } = req.body;
    if (!searchType || !searchValue) {
      return res
        .status(400)
        .json({ error: "Search type and search value are required" });
    }
    const results = [];

    if (role === "Borrower") {
      const packageCount = await contract_lender.methods.packageCount().call();
      const parsedCount = parseInt(packageCount);

      // Loop based on the retrieved packageCount
      for (let i = 0; i < parsedCount; i++) {
        // Call another function to get loan package details
        const packageDetails = await contract_lender.methods
          .loanPackages(i)
          .call();

        // Check if the package details match the search criteria

        // Convert BigInt values to strings before sending back in JSON response
        for (const key in packageDetails) {
          if (typeof packageDetails[key] === "bigint") {
            packageDetails[key] = parseInt(packageDetails[key]);
          }
        }
        packageDetails["id"] = i;
        if (packageDetails["active"] === true) {
          if (searchType == "interestRate") {
            if (packageDetails["interest"].toString() === searchValue)
              results.push(packageDetails);
          } else if (searchType == "amount") {
            if (packageDetails["loanAmount"].toString() === searchValue)
              results.push(packageDetails);
          }
        }
      }
    }
    if (role === "Lender") {
      const packageCount = await contract_borrower.methods.totalLoans().call();
      const parsedCount = parseInt(packageCount);

      // Loop based on the retrieved packageCount
      for (let i = 0; i < parsedCount; i++) {
        // Call another function to get loan package details
        const packageDetails = await contract_borrower.methods.loans(i).call();

        // Check if the package details match the search criteria

        // Convert BigInt values to strings before sending back in JSON response
        for (const key in packageDetails) {
          if (typeof packageDetails[key] === "bigint") {
            packageDetails[key] = parseInt(packageDetails[key]);
          }
        }
        packageDetails["id"] = i;
        if (packageDetails["isActive"] === true) {
          if (searchType == "interestRate") {
            if (packageDetails["interestRate"].toString() === searchValue)
              results.push(packageDetails);
          } else if (searchType == "amount") {
            if (packageDetails["amount"].toString() === searchValue)
              results.push(packageDetails);
          }
        }
      }
    }
    res.json({ results });
  } catch (error) {
    console.error("Error calling smart contract function:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/packages/borrower/all", async (req, res) => {
  try {
    // Call the desired function of the smart contract
    const packageCount = await contract_lender.methods.packageCount().call();
    const parsedCount = parseInt(packageCount);

    // Loop based on the retrieved packageCount
    const results = [];
    for (let i = 0; i < parsedCount; i++) {
      // Call another function to get loan package details
      const packageDetails = await contract_lender.methods
        .loanPackages(i)
        .call();

      // Convert BigInt values to strings before sending back in JSON response
      for (const key in packageDetails) {
        if (typeof packageDetails[key] === "bigint") {
          packageDetails[key] = parseInt(packageDetails[key]);
        }
      }
      packageDetails["id"] = i;
      if (packageDetails["active"] == true) results.push(packageDetails);
    }

    res.json({ results });
  } catch (error) {
    console.error("Error calling smart contract function:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/user/borrower/customloans/:parameter", async (req, res) => {
  try {
    const { parameter } = req.params;

    // Call the desired function of the smart contract
    const packageCount = await contract_borrower.methods.totalLoans().call();
    const parsedCount = parseInt(packageCount);

    // Loop based on the retrieved packageCount
    const results = [];
    for (let i = 0; i < parsedCount; i++) {
      // Call another function to get loan package details
      const packageDetails = await contract_borrower.methods.loans(i).call();

      // Convert BigInt values to strings before sending back in JSON response
      for (const key in packageDetails) {
        if (typeof packageDetails[key] === "bigint") {
          packageDetails[key] = parseInt(packageDetails[key]);
        }
      }
      packageDetails["id"] = i;
      if (packageDetails["borrower"].toString().toLowerCase() == parameter)
        results.push(packageDetails);
    }
    res.json({ results });
  } catch (error) {
    console.error("Error calling smart contract function:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/packages/lender/specific/:parameter", async (req, res) => {
  try {
    const { parameter } = req.params;

    // Call the desired function of the smart contract
    const packageCount = await contract_lender.methods.packageCount().call();
    const parsedCount = parseInt(packageCount);

    // Loop based on the retrieved packageCount
    const results = [];
    for (let i = 0; i < parsedCount; i++) {
      // Call another function to get loan package details
      const packageDetails = await contract_lender.methods
        .loanPackages(i)
        .call();

      // Convert BigInt values to strings before sending back in JSON response
      for (const key in packageDetails) {
        if (typeof packageDetails[key] === "bigint") {
          packageDetails[key] = parseInt(packageDetails[key]);
        }
      }
      packageDetails["id"] = i;
      if (packageDetails["packageOwner"].toLowerCase() === parameter)
        results.push(packageDetails);
    }

    res.json({ results });
  } catch (error) {
    console.error("Error calling smart contract function:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/packages/lender/custom/specific/:parameter", async (req, res) => {
  try {
    const { parameter } = req.params;

    // Call the desired function of the smart contract
    const packageCount = await contract_borrower.methods.totalLoans().call();
    const parsedCount = parseInt(packageCount);

    // Loop based on the retrieved packageCount
    const results = [];
    for (let i = 0; i < parsedCount; i++) {
      // Call another function to get loan package details
      const packageDetails = await contract_borrower.methods
        .loans(i)
        .call();

      // Convert BigInt values to strings before sending back in JSON response
      for (const key in packageDetails) {
        if (typeof packageDetails[key] === "bigint") {
          packageDetails[key] = parseInt(packageDetails[key]);
        }
      }
      packageDetails["id"] = i;
      if (packageDetails["lender"].toLowerCase() === parameter)
        results.push(packageDetails);
    }

    res.json({ results });
  } catch (error) {
    console.error("Error calling smart contract function:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get("/packages/active/lender/specific/:parameter", async (req, res) => {
  try {
    const { parameter } = req.params;

    // Call the desired function of the smart contract
    const packageCount = await contract_lender.methods.packageCount().call();
    const parsedCount = parseInt(packageCount);

    // Loop based on the retrieved packageCount
    const results = [];
    for (let i = 0; i < parsedCount; i++) {
      // Call another function to get loan package details
      const packageDetails = await contract_lender.methods
        .loanPackages(i)
        .call();

      // Convert BigInt values to strings before sending back in JSON response
      for (const key in packageDetails) {
        if (typeof packageDetails[key] === "bigint") {
          packageDetails[key] = parseInt(packageDetails[key]);
        }
      }
      packageDetails["id"] = i;
      if (
        packageDetails["packageOwner"].toLowerCase() === parameter &&
        packageDetails["active"] === true
      )
        results.push(packageDetails);
    }

    res.json({ results });
  } catch (error) {
    console.error("Error calling smart contract function:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/user/borrower/history/:parameter", async (req, res) => {
  try {
    const { parameter } = req.params;

    // Call the desired function of the smart contract

    var packageIds = [];
    BorrowerHistory.findOne({ wallet: parameter.toString().toLowerCase() })
      .then(async (doc) => {
        if (doc) {
          packageIds = doc.packageIDs; // Handle potential absence of "packageIDs" field
          console.log(`Package IDs ${parameter}:`, packageIds);
          const results = [];
          for (let i = 0; i < packageIds.length; i++) {
            index = parseInt(packageIds[i]);
            console.log(index);
            // Call another function to get loan package details
            const packageDetails = await contract_lender.methods
              .loanPackages(index)
              .call();
            console.log(packageDetails);

            // Convert BigInt values to strings before sending back in JSON response
            for (const key in packageDetails) {
              if (typeof packageDetails[key] === "bigint") {
                packageDetails[key] = parseInt(packageDetails[key]);
              }
            }
            packageDetails["id"] = index;
            results.push(packageDetails);
          }
          res.json({ results });
        } else {
          const results = [];

          console.log("No wallet found with ID:", parameter);
          res.json({ results });
        }
      })
      .catch((err) => {
        console.error("Error retrieving package IDs:", err);
      });

    // Loop based on the retrieved packageCount
  } catch (error) {
    console.error("Error calling smart contract function:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/packages/lender/all", async (req, res) => {
  try {
    // Call the desired function of the smart contract
    const packageCount = await contract_borrower.methods.totalLoans().call();
    const parsedCount = parseInt(packageCount);

    // Loop based on the retrieved packageCount
    const results = [];
    for (let i = 0; i < parsedCount; i++) {
      // Call another function to get loan package details
      const packageDetails = await contract_borrower.methods.loans(i).call();

      // Convert BigInt values to strings before sending back in JSON response
      for (const key in packageDetails) {
        if (typeof packageDetails[key] === "bigint") {
          packageDetails[key] = parseInt(packageDetails[key]);
        }
      }
      packageDetails["id"] = i;

      if (packageDetails["isActive"] === true) {
        results.push(packageDetails);
      }
    }

    res.json({ results });
  } catch (error) {
    console.error("Error calling smart contract function:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/packages/suggested/:parameter", async (req, res) => {
  const { parameter } = req.params;

  try {
    // Call the desired function of the smart contract
    const packageCount = await contract_lender.methods.packageCount().call();
    const parsedCount = parseInt(packageCount);
    const modelPackageDetails = await contract_lender.methods
      .loanPackages(parseInt(parameter))
      .call();

    // Loop based on the retrieved packageCount
    const results = [];
    for (let i = 0; i < parsedCount; i++) {
      // Call another function to get loan package details
      const packageDetails = await contract_lender.methods
        .loanPackages(i)
        .call();

      // Convert BigInt values to strings before sending back in JSON response
      for (const key in packageDetails) {
        if (typeof packageDetails[key] === "bigint") {
          packageDetails[key] = parseInt(packageDetails[key]);
        }
      }

      // Ensure that interest and loanAmount are BigInt
      const interestDiff =
        BigInt(packageDetails.interest) - BigInt(modelPackageDetails.interest);
      const amountDiff =
        BigInt(packageDetails.loanAmount) -
        BigInt(modelPackageDetails.loanAmount);
      if (results.length > 4) {
        break;
      }
      if (interestDiff <= BigInt(5) || amountDiff <= BigInt(2000)) {
        packageDetails.id = i;
        results.push(packageDetails);
      }
    }

    res.json({ results });
  } catch (error) {
    console.error("Error calling smart contract function:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  subscribeToLogs();
});
