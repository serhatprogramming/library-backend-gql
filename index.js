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

console.log("connecting to MongoDB...");

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("connected to MongoDB");
  })
  .catch((error) => {
    console.log("error connection to MongoDB:", error.message);
  });

// typedefs
const typeDefs = `

  type Book {
    title: String!
    published: Int!
    author: Author!
    id: ID!
    genres: [String!]!,
  }

  type Author {
    name: String!
    id: ID!
    born: Int
    bookCount: Int
  }

  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author:String, genre:String): [Book!]!
    allAuthors: [Author!]!
    me: User
  }

  type Mutation {
    addBook(
      title: String!
      published: Int!
      name: String!
      genres: [String!]!
      ):Book
    editAuthor(
      name:String!
      setBornTo: Int!
    ):Author
    addAuthor(
      name:String!
      born:Int
    ):Author
    createUser(
      username: String!
      favoriteGenre: String!
    ): User
    login(
      username: String!
      password: String!
    ): Token
  }
`;
// resolvers
const resolvers = {
  Query: {
    bookCount: () => Book.collection.countDocuments(),
    authorCount: () => Author.collection.countDocuments(),
    allBooks: async (root, args) => {
      let books = await Book.find({}).populate("author");
      books = args.author
        ? books.filter((book) => book.author.name === args.author)
        : books;
      books = args.genre
        ? books.filter((book) => book.genres.includes(args.genre))
        : books;
      return books;
    },
    allAuthors: async () => Author.find({}),
  },
  Mutation: {
    addBook: async (root, args) => {
      let author = null;
      const foundAuthor = await Author.findOne({ name: args.name });
      try {
        if (!foundAuthor) {
          author = new Author({ name: args.name, bookCount: 1 });
          await author.save();
        } else {
          foundAuthor.bookCount = foundAuthor.bookCount + 1;
          await foundAuthor.save();
          author = foundAuthor;
        }
        const book = new Book({ ...args, author });
        return book.save();
      } catch (error) {
        throw new GraphQLError("Saving user failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args.name,
            error,
          },
        });
      }
    },
    addAuthor: async (root, args) => {
      const author = new Author({ ...args, bookCount: 0 });
      try {
        return author.save();
      } catch (error) {
        throw new GraphQLError("Saving user failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args.name,
            error,
          },
        });
      }
    },
    editAuthor: async (root, args) => {
      const author = await Author.findOne({ name: args.name });
      author.born = args.setBornTo;
      return author.save();
    },
    createUser: async (root, args) => {
      const user = new User({
        username: args.username,
        favoriteGenre: args.favoriteGenre,
      });

      return user.save().catch((error) => {
        throw new GraphQLError("Creating the user failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args.name,
            error,
          },
        });
      });
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });

      if (!user || args.password !== "secret") {
        throw new GraphQLError("wrong credentials", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      };

      return { value: jwt.sign(userForToken, process.env.JWT_SECRET) };
    },
  },
};

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
