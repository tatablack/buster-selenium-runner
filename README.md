# BusterJS meets Selenium Grid

One of the benefits of unit testing is, undoubtedly, quick feedback after changing a piece of code.

When doing JavaScript unit testing, though, it's often desirable to run your tests in all the browser you support (assuming they have different JavaScript engines).
This conflicts with the aforementioned "quick feedback" benefit.

A possible solution is running your tests locally, using [BusterJS](http://www.busterjs.org/) in [headless mode](http://docs.busterjs.org/en/latest/overview/#headless-browser-testing) for the quickest possible feedback.

However, after pushing to your VCS of choice, it would be nice to run your tests again on multiple browsers, maybe even taking advantage of a
[Selenium Grid](https://code.google.com/p/selenium/wiki/Grid2) installation. This would require at least the following steps:

1. Start a Buster server.
2. Ask a Selenium Grid server for a node with the desired capabilities (for example, running Internet Explorer 9 on Windows XP, or Firefox on OSX).
3. Capture that browser instance with Buster.
4. Run your test suite.

It would be even better if you could run a single Buster server and capture different Grid nodes all at once (say, IE 9, Chrome, Firefox),
and maybe even run more that one test suite in a single command.

Can you guess what this project is about, now? I think you can. :smirk:

## Setup and configuration
Download the standalone grid jar. Start it once in a server role, once in a node role.
Checkout `buster-selenium-runner`, and install the required dependencies (`npm install`).
Run `./lib/Testrunner.js`.

Out of the box, the default configuration should start a Buster server, capture a firefox instance (provided your grid node is configured correctly),
and then stop: no test suites are listed in the default configuration file.


## What works
Running one or multiple test suites works.

## what _doesn't_ work
Using multiple grid nodes _seems_ to work, but strange things happen, so I'd advise against it for now.

## What's missing
I'm ashamed to admit it, but there are no tests. I was not even sure if all this was possible, so I wanted a reality check first.

## What can be improved (aka "the roadmap")
+ Error handling needs some love. I know of existing issues when using node.js Domains with BusterJS, so I skipped them for now.
Even then, current error/exception handling needs at least some refactoring.

+ Running buster tests. I really wouldn't want to use `buster-test-cli` from inside a node.js application, but it seemed the easiest solution at the beginning.
I'd like to dive into BusterJS code a little more, and use buster-test instead.
