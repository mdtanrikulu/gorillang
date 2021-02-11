import fs          from "fs";
import os          from "os";
import path        from "path";
import xlsx        from "xlsx";
import puppeteer   from "puppeteer";
import { program } from "commander";

const pjson = require("./package.json");
const tmp   = os.tmpdir();
// import zl   from "zip-lib";

program.version(pjson.version);

async function main(
  email, 
  password, 
  input, 
  output, 
  revision, 
  soundColumn, 
  nameColumn,
  groupNumber,
  groupDist,
  skipRename
) {
  const revisionInfo    = await checkDownload(revision);
  const [browser, page] = await setupBrowser(output, revisionInfo);
  await login(page, email, password);

  const XLSX_FILE_PATH  = input;
  const SAVE_FOLDER     = output;

  const SOUND_COLUMN    = soundColumn;
  const NAMING_COLUMN   = nameColumn;

  const sheet           = xlsx.readFile(XLSX_FILE_PATH);
  const table           = sheet.Sheets.data;

  async function downloadAudio(url) {
    try {
      await page.goto(url);
    } catch (error) {
      if (!error.toString().includes("net::ERR_ABORTED")) {
        console.log("error", error);
      }
      // do nothing;
    }
  }

  function zipFolder() {
    // zl.archiveFile(SAVE_FOLDER, path.join(SAVE_FOLDER, "sounds.zip")).then(
    //   function () {
    //     console.log("done");
    //   },
    //   function (err) {
    //     console.log(err);
    //   }
    // );
  }

  function renameFiles(downloadedFileNames) {
    const allFiles = Object.entries(downloadedFileNames);
    let filesPerGroup = allFiles.length;
    if (!!groupDist && groupDist.length !== groupNumber) 
      throw Error(`Distribution pattern should be available for ${groupNumber} groups.`);
    if (!!groupDist && groupDist.length) {
      filesPerGroup = groupDist[0];
    } else {
      filesPerGroup = allFiles.length / groupNumber;
    }
    let count = 1, countW = 1;

    for (const [key, value] of allFiles) {
      const targetFile      = path.join(SAVE_FOLDER, key);
      const destinationFile = path.join(SAVE_FOLDER, `${count}_${countW}-${value}`);
      console.log(key, `${count}-${countW}-${value}`);
      if(!!groupDist && groupDist.length) {
        filesPerGroup = groupDist[countW];
      }
      if (count % filesPerGroup === 0) countW++;
      count++;
      fs.rename(targetFile, destinationFile, function (error) {
        if (error) console.log("ERROR: " + error);
      });
    }
    zipFolder();
  }

  async function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time * 1000));
  }

  async function listAudio() {
    const tableSize = Object.keys(table).length / 50;
    let downloadedFileNames = {};

    for (let index = 0; index < tableSize; index++) {
      if (table[`${SOUND_COLUMN}${index}`]) {
        const [_, value] = Object.entries(table[`${SOUND_COLUMN}${index}`]);
        if (value[1].startsWith("https")) {
          const [_keyPic, valPic] = Object.entries(
            table[`${NAMING_COLUMN}${index}`]
          );
          let filename  = value[1].split("=")[1];
          filename      = filename.replace(".weba", ".wav");
          const newName = valPic[1].slice(0, -4) + ".wav";
          await downloadAudio(value[1]);

          console.log(filename, newName);
          downloadedFileNames[filename] = newName;
          await sleep(1);
        }
      }
    }
    await browser.close();
    if (skipRename) return;
    renameFiles(downloadedFileNames);
  }

  listAudio();
}

async function checkDownload(revision) {
  const browserFetcher = puppeteer.createBrowserFetcher({
    product: "chrome",
    path: `${tmp}/.local-chrome`,
  });
  console.log(`${tmp}/.local-chrome`);
  let revisionInfo = browserFetcher.revisionInfo(revision);
  if (!revisionInfo.local) {
    revisionInfo = await browserFetcher.download(
      revision,
      (chunk, total) => {
        console.clear()
        console.log("Downloading Chromium:");
        console.log(`% ${((chunk / total) * 100).toFixed(2)} is downloaded.`);
      }
    );
    return revisionInfo;
  }
  return revisionInfo;
}

async function setupBrowser(output, revisionInfo) {
  const browser = await puppeteer.launch({
    platform: "chrome",
    headless: true,
    executablePath: revisionInfo.executablePath,
    args: ["-wait-for-browser", "--mute-audio", "--profile-directory=Default"],
  });
  const page   = await browser.newPage();
  const client = await page.target().createCDPSession();
  await client.send("Fetch.enable", {
    patterns: [
      {
        urlPattern: "*",
        requestStage: "Response",
      },
    ],
  });
  await client.on("Fetch.requestPaused", async (reqEvent) => {
    const { requestId } = reqEvent;

    let responseHeaders = reqEvent.responseHeaders || [];
    let contentType = "";

    for (let elements of responseHeaders) {
      if (elements.name.toLowerCase() === "content-type") {
        contentType = elements.value;
      }
    }

    if (contentType.endsWith("wav") || contentType.endsWith("weba")) {
      responseHeaders.push({
        name: "content-disposition",
        value: "attachment",
      });

      const responseObj = await client.send("Fetch.getResponseBody", {
        requestId,
      });

      await client.send("Fetch.fulfillRequest", {
        requestId,
        responseCode: 200,
        responseHeaders,
        body: responseObj.body,
      });
    } else {
      await client.send("Fetch.continueRequest", { requestId });
    }
  });
  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: output,
  });
  await page.setViewport({ width: 1200, height: 720 });
  return [browser, page];
}

async function login(page, email, password) {
  await page.goto("https://gorilla.sc/login");
  await page.type("#email", email);
  await page.type("#password", password);
  await page.click("#login-button");
  await page.waitForNavigation();
}

process.on('warning', (warning) => {
  if (!warning.message.includes("Buffer() is deprecated")) {
    console.error(warning);
  }
});

program
  .requiredOption("-e, --email <email>", "Your account mail")
  .requiredOption("-p, --password <password>", "Your account password")
  .requiredOption("-i, --input <input>", "XLSX File from Gorilla")
  .requiredOption("-o, --output <output>", "Output Folder of Audio")
  .option("-r, --revision <revision>", "Chromium Revision", "827102")
  .option("-sc, --sound-column <soundColumn>", "Column name shows sound urls in XLSX", "AL")
  .option("-nc, --name-column <nameColumn>", "Column name shows sound file names in XLSX", "AX")
  .option("-g, --group <groupNumber>", "Number of test group in given file", 1)
  .option("-gd, --distribution <groupDist...>", "Task distribution for each group (evenly by default)")
  .option("--skip-rename", "Skip renaming of audio files");
program.parse(process.argv);
const options = program.opts();

main(
  options.email, 
  options.password, 
  options.input, 
  options.output,
  options.revision,
  options.soundColumn,
  options.nameColumn,
  options.group,
  options.distribution,
  options.skipRename
);
