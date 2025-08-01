const fs = require("fs");
const path = require("path");

class BranchCommand {
  constructor(branchName) {
    this.branchName = branchName;
    this.gitPath = path.join(process.cwd(), ".git");
    this.refsPath = path.join(this.gitPath, "refs", "heads");
  }

  getCurrentCommit() {
    const headContent = fs
      .readFileSync(path.join(this.gitPath, "HEAD"), "utf-8")
      .trim();
    if (!headContent.startsWith("ref: ")) {
      // Detached HEAD state, not handled in this simple version
      return headContent;
    }
    const refPath = headContent.split(" ")[1];
    const fullRefPath = path.join(this.gitPath, refPath);

    if (fs.existsSync(fullRefPath)) {
      return fs.readFileSync(fullRefPath, "utf-8").trim();
    }
    return null; // Should not happen in a valid repo with commits
  }

  listBranches() {
    const headContent = fs
      .readFileSync(path.join(this.gitPath, "HEAD"), "utf-8")
      .trim();
    const currentRef = headContent.startsWith("ref: ")
      ? headContent.split(" ")[1]
      : null;

    const branches = fs.readdirSync(this.refsPath);
    branches.forEach((branch) => {
      const branchRef = `refs/heads/${branch}`;
      if (branchRef === currentRef) {
        console.log(`* ${branch}`);
      } else {
        console.log(`  ${branch}`);
      }
    });
  }

  execute() {
    if (!this.branchName) {
      // If no branch name is provided, list existing branches.
      this.listBranches();
      return;
    }

    const newBranchPath = path.join(this.refsPath, this.branchName);
    if (fs.existsSync(newBranchPath)) {
      console.error(
        `fatal: A branch named '${this.branchName}' already exists.`
      );
      process.exit(128);
    }

    const currentCommitSha = this.getCurrentCommit();
    if (!currentCommitSha) {
      console.error("fatal: Not a valid object name: 'HEAD'.");
      process.exit(128);
    }

    // Create the new branch file pointing to the current commit
    fs.writeFileSync(newBranchPath, `${currentCommitSha}\n`);
    console.log(
      `Branch '${this.branchName}' set up to track local branch 'main'.`
    );
  }
}

module.exports = BranchCommand;
