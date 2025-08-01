const fs = require("fs");
const path = require("path");

const GitClient = require("./git/client");

// Commands
const {
  CatFileCommand,
  HashObjectCommand,
  LSTreeCommand,
  WriteTreeCommand,
  CommitTreeCommand,
  AddCommand,
  CommitCommand,
  BranchCommand,
  CheckoutCommand,
  MergeCommand,
} = require("./git/commands");

const gitClient = new GitClient();

const command = process.argv[2];

switch (command) {
  case "init":
    createGitDirectory();
    break;
  case "cat-file":
    handleCatFileCommand();
    break;
  case "hash-object":
    handleHashObjectCommand();
    break;
  case "ls-tree":
    handleLsTreeCommand();
    break;
  case "write-tree":
    handleWriteTreeCommand();
    break;
  case "commit-tree":
    handleCommitTreeCommand();
    break;
  case "add":
    handleAddCommand();
    break;
  case "commit":
    handleCommitCommand();
    break;
  case "branch":
    handleBranchCommand();
    break;
  case "checkout":
    handleCheckoutCommand();
    break;
  case "merge":
    handleMergeCommand();
    break;
  default:
    throw new Error(`Unknown command ${command}`);
}

function createGitDirectory() {
  const gitPath = path.join(process.cwd(), ".git");
  
  // Remove existing .git directory to ensure fresh start
  if (fs.existsSync(gitPath)) {
    fs.rmSync(gitPath, { recursive: true, force: true });
  }
  
  // Create fresh .git directory structure
  fs.mkdirSync(path.join(gitPath, "objects"), {
    recursive: true,
  });

  fs.mkdirSync(path.join(gitPath, "refs", "heads"), { recursive: true });

  fs.writeFileSync(path.join(gitPath, "HEAD"), "ref: refs/heads/main\n");
  console.log(`Initialized empty Git repository in ${gitPath}/`);
}

function handleCatFileCommand() {
  const flag = process.argv[3];
  const commitSHA = process.argv[4];

  const command = new CatFileCommand(flag, commitSHA);
  gitClient.run(command);
}

function handleHashObjectCommand() {
  let flag = process.argv[3];
  let filePath = process.argv[4];

  if (!filePath) {
    filePath = flag;
    flag = null;
  }

  const command = new HashObjectCommand(flag, filePath);
  gitClient.run(command);
}

function handleLsTreeCommand() {
  let flag = process.argv[3];
  let commitSHA = process.argv[4];

  if (flag === "--name-only" && !commitSHA) {
    console.error("fatal: --name-only requires a tree-ish");
    process.exit(128);
  }

  // optional flag --name-only
  if (!commitSHA) {
    commitSHA = flag;
    flag = null;
  }

  const command = new LSTreeCommand(flag, commitSHA);
  gitClient.run(command);
}

function handleWriteTreeCommand() {
  const command = new WriteTreeCommand();
  gitClient.run(command);
}

function handleCommitTreeCommand() {
  const tree = process.argv[3];
  const commitSHA = process.argv[5];
  const commitMessage = process.argv[7];

  const command = new CommitTreeCommand(tree, commitSHA, commitMessage);
  gitClient.run(command);
}

function handleAddCommand() {
  const filepath = process.argv[3];
  if (!filepath) {
    console.error("fatal: you must specify a file to add.");
    process.exit(128);
  }
  const command = new AddCommand(filepath);
  gitClient.run(command);
}

function handleCommitCommand() {
  const messageFlag = process.argv[3];
  const message = process.argv[4];

  if (messageFlag !== "-m" || !message) {
    console.error("fatal: commit message is required. Use -m <message>.");
    process.exit(128);
  }

  const command = new CommitCommand(message);
  command.execute();
}

function handleBranchCommand() {
  const branchName = process.argv[3]; // Optional argument
  const command = new BranchCommand(branchName);
  command.execute();
}

function handleCheckoutCommand() {
  const branchName = process.argv[3];
  if (!branchName) {
    console.error("fatal: branch name required");
    process.exit(128);
  }
  const command = new CheckoutCommand(branchName);
  command.execute();
}

function handleMergeCommand() {
  const branchToMerge = process.argv[3];
  if (!branchToMerge) {
    console.error("fatal: No branch specified to merge.");
    process.exit(128);
  }
  const command = new MergeCommand(branchToMerge);
  command.execute();
}
