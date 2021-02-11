## Usage

Download pre-built binary, open terminal window and run the app with;
```bash
./gorillang-macos \
    -e gorilla_account \
    -p gorilla_password \
    -i /Users/Path/Documents/my_experiment_file.xlsx \
    -o output_folder_name
```

## Flags

| Flag (short) | Flag (long) | Description | Default | Required |
| ------------ | ----------- | ----------- | ------- | ----- |
| `-e` | `--email` | Your e-mail for gorilla account | | yes |
| `-p` | `--password` | Your password for gorilla account | | yes |
| `-i` | `--input` | XLSX File from Gorilla | | yes |
| `-o` | `--output` | Output Folder of Audio | | yes |
| `-r` | `--revision` | Chromium Revision | "827102" | no |
| `-sc` | `--sound-column` | Column name shows sound urls in XLSX | "AL" | depend on task |
| `-nc` | `--name-column` | Column name shows sound file names in XLSX | "AX" | depend on task |
| `-g` | `--group` | Number of test group in given file | 1 | depend on task |
| `-gd` | `--distribution` | Task distribution for each group | evenly | depend on task |
|  | `--skip-rename` | Skip renaming of audio files | false | no |


## How to prepare run command for my task

1. Be sure you entered correct credientals for gorilla, and logout from your account if open in any browser.
2. Put your XLSX input file path correctly
3. For output folder, give only the folder name no path. The folder will be created near the application file.
4. Check sound column and name column in your XLSX file, if sound urls under AL and file names are under AX column, the you're good to go. If not, specify correct column names via `-sc` and `-nc` flags.
5. If your XLSX file contains only one group of participant results, then you're good to go. If not, check "renaming strategy" section.
6. If you don't need any file renaming at all, you can skip it by calling `--skip-rename` flag.

## Renaming Strategy

If your XLSX file consist of multiple group of participants, you may want to rename audio files in a way that you can distinguish the file by their name as like, which group they're belong to.

To do that, I provided two optional flags.

First one is `-g` or `--group` flag: You can tell to your app, how many groups you have in given XLSX file, so application will divide total audio file amount to the given amount and rename it in this way.
i.e.
```bash
...other_commands -g 2

# output of group 1
1_1-apple.wav
2_1-melon.wav
# output of group 2
3_2-kangaroo.wav
4_2-chicken.wav
```
For total amount of 4 audio files, the application stated that first 2 audio files are belong to the first group, the rest two are belong to the second one.

### Uneven distributions

For more advanced situations, I provided another flag which we call `-gd` in short, or `--distribution` in long way. This flag maybe helpful, in case of, if given groups do not have evenly distributed amount of audio files in given XLSX file.
i.e. you have 4 total audio files, 2 groups of participants and 1st audio file is belong to the first group, the rest 3 are belong the second group. Then you can define it to the app as shown below
```bash
...other_commands -g 2 -dg 1 3

# output of group 1
1_1-apple.wav
# output of group 2
2_2-melon.wav
3_2-kangaroo.wav
4_2-chicken.wav

```
