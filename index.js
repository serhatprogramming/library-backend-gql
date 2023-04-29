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
// MongoDB database connect
const MONGODB_URI = process.env.MONGODB_URI;

console.log("connecting to MongoDB...");

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("connected to MongoDB");
  })
  .catch((error) => {
    console.log("error connection to MongoDB:", error.message);
  });

let authors = [
  {
    name: "Robert Martin",
    id: "afa51ab0-344d-11e9-a414-719c6709cf3e",
    born: 1952,
  },
  {
    name: "Martin Fowler",
    id: "afa5b6f0-344d-11e9-a414-719c6709cf3e",
    born: 1963,
  },
  {
    name: "Fyodor Dostoevsky",
    id: "afa5b6f1-344d-11e9-a414-719c6709cf3e",
    born: 1821,
  },
  {
    name: "Joshua Kerievsky", // birthyear not known
    id: "afa5b6f2-344d-11e9-a414-719c6709cf3e",
  },
  {
    name: "Sandi Metz", // birthyear not known
    id: "afa5b6f3-344d-11e9-a414-719c6709cf3e",
  },
];

/*
 * English:
 * It might make more sense to associate a book with its author by storing the author's id in the context of the book instead of the author's name
 * However, for simplicity, we will store the author's name in connection with the book
 */

let books = [
  {
    title: "Clean Code",
    published: 2008,
    author: "Robert Martin",
    id: "afa5b6f4-344d-11e9-a414-719c6709cf3e",
    genres: ["refactoring"],
  },
  {
    title: "Agile software development",
    published: 2002,
    author: "Robert Martin",
    id: "afa5b6f5-344d-11e9-a414-719c6709cf3e",
    genres: ["agile", "patterns", "design"],
  },
  {
    title: "Refactoring, edition 2",
    published: 2018,
    author: "Martin Fowler",
    id: "afa5de00-344d-11e9-a414-719c6709cf3e",
    genres: ["refactoring"],
  },
  {
    title: "Refactoring to patterns",
    published: 2008,
    author: "Joshua Kerievsky",
    id: "afa5de01-344d-11e9-a414-719c6709cf3e",
    genres: ["refactoring", "patterns"],
  },
  {
    title: "Practical Object-Oriented Design, An Agile Primer Using Ruby",
    published: 2012,
    author: "Sandi Metz",
    id: "afa5de02-344d-11e9-a414-719c6709cf3e",
    genres: ["refactoring", "design"],
  },
  {
    title: "Crime and punishment",
    published: 1866,
    author: "Fyodor Dostoevsky",
    id: "afa5de03-344d-11e9-a414-719c6709cf3e",
    genres: ["classic", "crime"],
  },
  {
    title: "The Demon ",
    published: 1872,
    author: "Fyodor Dostoevsky",
    id: "afa5de04-344d-11e9-a414-719c6709cf3e",
    genres: ["classic", "revolution"],
  },
];

/*
  you can remove the placeholder query once your first own has been implemented 
*/

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
    bookCount: Int!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author:String, genre:String): [Book!]!
    allAuthors: [Author!]!
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
  }
`;

const resolvers = {
  Query: {
    bookCount: () => Book.collection.countDocuments(),
    authorCount: () => Author.collection.countDocuments(),
    allBooks: (root, args) => {
      let result = books;
      result = args.author
        ? result.filter((book) => book.author === args.author)
        : result;
      result = args.genre
        ? result.filter((book) => book.genres.includes(args.genre))
        : result;
      return result;
    },
    allAuthors: () =>
      authors.map((author) => ({
        ...author,
        bookCount: books.filter((book) => book.author === author.name).length,
      })),
  },
  Mutation: {
    addBook: async (root, args) => {
      let author = null;
      const foundAuthor = await Author.findOne({ name: args.name });
      if (!foundAuthor) {
        author = new Author({ name: args.name });
        await author.save();
      } else {
        author = foundAuthor;
      }
      const book = new Book({ ...args, author });
      return book.save();
    },
    addAuthor: async (root, args) => {
      const author = new Author({ ...args, bookCount: 0 });
      return author.save();
    },
    editAuthor: (root, args) => {
      if (!authors.find((author) => author.name === args.name)) {
        return null;
      }
      authors = authors.map((author) =>
        author.name === args.name ? { ...author, born: args.setBornTo } : author
      );
      return authors.find((author) => author.name === args.name);
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

startStandaloneServer(server, {
  listen: { port: 4000 },
}).then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
