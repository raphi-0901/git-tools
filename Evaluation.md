# feature request:
- when staging many files and one commit message makes no sense - split into multiple commits.
- problem: one file can include changes for several commits and staging is then way more complicated.
- how to show that to the user, what files would be included in the commit and which not?

# auto-commit
use conventional commit messages -> we can conclude if the correct type was chosen

- how to classify the commit message? -> decision tree, time taken

1. empty commit -> should exit or do nothing
2. create new feature -> should have `feat:` in the name
3. fix bug -> should have `fix:` in the name
4. refactor -> should have `refactor:` in the name
5. docs -> should have `docs:` in the name
6. chore -> should have `chore:` in the name
7. change a rule in an eslint config and run eslint --fix and try to run it: should be able to catch that (-> there are way many files)

run auto-commit against gemini-cli with `--yolo` mode providing one good prompt and one very basic prompt.

# auto-branch
research what are good names for branches.
-> rely also on conventional commit messages technique. like it should be easy to find the correct type such as bugfix or refactor or feature.

1. show one case where private repos don't work even after providing the api key
2. check if it matches the given format, like <type>/<issue-number>-<description-in-kebab-case>

# branch-cleanup
precision/recall or f-score

1. set up 


# todo
- [ ] create a github repository for testing
  - [ ] should have several issues
  - [ ] should have several branches
    - [ ] few of them should be merged
    - [ ] few of them should be open
    - [ ] have to adjust the commit creation time in order to reliably test the branch-cleanup feature
