const CatFileCommand = require("./cat-file");
const HashObjectCommand = require("./hash-object");
const LSTreeCommand = require("./ls-tree");
const WriteTreeCommand = require("./write-tree");
const CommitTreeCommand = require("./commit-tree");
const AddCommand = require("./add");
const CommitCommand = require("./commit");
const BranchCommand = require("./branch");
const CheckoutCommand = require("./checkout");
const MergeCommand = require("./merge");

module.exports = {
  CatFileCommand,
  HashObjectCommand,
  LSTreeCommand,
  WriteTreeCommand,
  AddCommand,
  CommitTreeCommand,
  CommitCommand,
  BranchCommand,
  CheckoutCommand,
  MergeCommand,
};
