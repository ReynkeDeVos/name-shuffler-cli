#!/usr/bin/env node

import boxen from "boxen";
import chalk from "chalk";
import figlet from "figlet";
import inquirer from "inquirer";
import ora from "ora";
import { pastel } from "gradient-string";
import { setTimeout } from "timers/promises";

// Function to handle graceful exit
function exitGracefully() {
  console.clear();
  console.log(
    pastel.multiline("\nThank you for using Name Shuffler! Goodbye! 👋\n")
  );
  process.exit(0);
}

// Handle CTRL+C gracefully
process.on("SIGINT", exitGracefully);

// Display the application title with ASCII art and gradient colors
async function displayTitle() {
  console.clear();

  const title = figlet.textSync("Name Shuffler", {
    font: "Standard",
    horizontalLayout: "default",
    verticalLayout: "default",
  });

  // Use rainbow gradient with modern import approach
  console.log(pastel.multiline(title));

  // Add a small delay for effect
  await setTimeout(500);
}

// Fisher-Yates shuffle algorithm for randomizing array elements
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Create evenly distributed groups of names using round-robin assignment
function createGroups(names, numberOfGroups) {
  const shuffledNames = shuffle(names);
  const groups = Array.from({ length: numberOfGroups }, () => []);

  // Distribute names evenly across groups
  shuffledNames.forEach((name, index) => {
    groups[index % numberOfGroups].push(name);
  });

  return groups;
}

// Render the groups with colored boxes
function displayGroups(groups) {
  const totalPeople = groups.reduce((sum, group) => sum + group.length, 0);
  const termWidth = Math.min(process.stdout.columns || 80, 80);

  // Display summary
  console.log(
    boxen(
      chalk.bold.yellow("RESULTS") +
        "\n\n" +
        chalk.white(`People: ${chalk.cyan(totalPeople)}`) +
        chalk.white(` • Groups: ${chalk.cyan(groups.length)}`),
      {
        padding: 1,
        margin: { top: 0, bottom: 0 },
        borderStyle: "round",
        borderColor: "yellow",
        textAlignment: "center",
      }
    )
  );

  // Styling elements
  const colors = ["green", "magenta", "blue", "red", "cyan", "yellow"];

  // Calculate the maximum name length across all groups
  const maxNameLength = Math.max(
    ...groups.flatMap((group) => group.map((name) => name.length))
  );

  // Calculate box width based on the longest name plus padding
  const boxWidth = Math.max(10, Math.min(20, maxNameLength + 4));

  // Calculate how many boxes can fit in one row
  const spaceBetweenBoxes = 2;
  const groupsPerRow = Math.max(
    1,
    Math.floor((termWidth - spaceBetweenBoxes) / (boxWidth + spaceBetweenBoxes))
  );

  // Format each group with its title and list of names
  const preparedGroups = groups.map((group, index) => {
    const color = colors[index % colors.length];

    const content =
      chalk.bold[color](`G${index + 1}`) +
      "\n\n" +
      group.map((name) => chalk.bold.white(name)).join("\n");

    return { content, color };
  });

  // Create uniformly sized boxes for each group
  const boxedGroups = preparedGroups.map(({ content, color }) => {
    return boxen(content, {
      padding: { top: 0, bottom: 1, left: 1, right: 1 },
      margin: 0,
      borderStyle: "round",
      borderColor: color,
      width: boxWidth,
    });
  });

  // Render groups in rows
  for (let i = 0; i < groups.length; i += groupsPerRow) {
    const rowGroups = boxedGroups.slice(i, i + groupsPerRow);
    const groupLines = rowGroups.map((box) => box.split("\n"));
    const rowHeight = Math.max(...groupLines.map((lines) => lines.length));

    // Render each line of the row
    for (let j = 0; j < rowHeight; j++) {
      let rowOutput = "";
      for (const lines of groupLines) {
        const line = j < lines.length ? lines[j] : "";
        rowOutput += line + " ".repeat(spaceBetweenBoxes);
      }
      console.log(rowOutput);
    }

    if (i + groupsPerRow < groups.length) {
      console.log();
    }
  }
}

// Main application flow
async function main() {
  await displayTitle();

  // Collect names from user input
  const { namesInput } = await inquirer.prompt([
    {
      type: "input",
      name: "namesInput",
      message:
        chalk.cyan("Enter names") +
        chalk.dim(" (separated by commas)") +
        chalk.cyan(":"),
      validate: (input) => {
        const names = input
          .split(",")
          .map((n) => n.trim())
          .filter((n) => n);
        if (names.length === 0) return "Please enter at least one name";
        if (names.length === 1)
          return "Please enter at least two names to shuffle";
        return true;
      },
      prefix: chalk.cyan("❯"),
    },
  ]);

  const names = namesInput
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  // Visual feedback while processing
  const nameSpinner = ora("Processing names...").start();
  await setTimeout(500);
  nameSpinner.succeed(`${chalk.green(names.length)} names received!`);

  // Desired number of groups
  const { numberOfGroups } = await inquirer.prompt([
    {
      type: "number",
      name: "numberOfGroups",
      message: chalk.cyan("Enter desired amount of groups:"),
      default: Math.min(
        Math.ceil(names.length / 3),
        Math.floor(names.length / 2)
      ),
      validate: (input) => {
        const num = parseInt(input);
        if (isNaN(num) || num <= 0) return "Please enter a positive number";
        if (num > names.length)
          return `Number of groups can't be larger than the number of names (${names.length})`;
        if (num === 1) return "Please enter at least 2 groups for shuffling";
        return true;
      },
      prefix: chalk.cyan("❯"),
    },
  ]);

  // Animated processing feedback
  const spinner = ora({
    text: "Initializing shuffle algorithm...",
    color: "cyan",
  }).start();

  await setTimeout(700);
  spinner.text = "Randomizing names...";
  await setTimeout(500);
  spinner.text = "Balancing groups...";
  await setTimeout(300);
  spinner.succeed(chalk.green("Names shuffled successfully!"));

  // Create and display the randomized groups
  const groups = createGroups(names, numberOfGroups);
  displayGroups(groups);
}

// Starts the application and handle any errors
main().catch((error) => {
  // Don't show error for ExitPromptError (CTRL+C during prompt)
  if (error.name === "ExitPromptError") {
    exitGracefully();
  }

  console.error(chalk.red("An error occurred:"), error);
  process.exit(1);
});
