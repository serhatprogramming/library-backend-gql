const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
// to generate unique ids uuid
const { v4: uuidv4 } = require("uuid");
// mongoose import and set
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
// import dotenv and config
require("dotenv").config();
// import models
const Author = require("./models/Author");
const Book = require("./models/Book");
const User = require("./models/User");
// MongoDB database connect
const MONGODB_URI = process.env.MONGODB_URI;
// jsonwebtoken
const jwt = require("jsonwebtoken");
// typeDefs, resolvers
const typeDefs = require("./schema");
const resolvers = require("./resolvers");

console.log("connecting to MongoDB...");

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("connected to MongoDB");
  })
  .catch((error) => {
    console.log("error connection to MongoDB:", error.message);
  });

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req, res }) => {
    const auth = req ? req.headers.authorization : null;
    if (auth && auth.startsWith("Bearer ")) {
      const decodedToken = jwt.verify(
        auth.substring(7),
        process.env.JWT_SECRET
      );
      const currentUser = await User.findById(decodedToken.id);
      return { currentUser };
    }
  },
}).then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
