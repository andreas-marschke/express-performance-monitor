"use strict";
module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    eslint: {
      options: {
        configFile: ".eslintrc",
        format: "compact"
      },
      src: [
        "Gruntfile.js",
        "index.js",
        "lib/*.js",
        "lib/**/**.js",
        "examples/*.js",
        "test/**.js"
      ]
    },
    mochaTest: {
      test: {
        options: {
          reporter: "tap",
          quiet: false,
          clearRequireCache: true,
          gc: true
        },
        src: [
          "test/index.js"
        ]
      }
    },
    jsdoc: {
      dist: {
        src: [
          "lib/**/*.js"
        ],
        options: {
          destination: "doc",
          configure: "./jsdoc.conf.json",
          readme: "README.md"
        }
      }
    }
  });

  grunt.loadNpmTasks("gruntify-eslint");
  grunt.loadNpmTasks("grunt-mocha-test");
  grunt.loadNpmTasks("grunt-jsdoc");

  grunt.registerTask("test", ["eslint", "mochaTest"]);
  grunt.registerTask("default", ["test"]);
};

