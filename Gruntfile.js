/* jshint node: true */

module.exports = function (grunt) {
    "use strict";
    // Project configuration.
    grunt.initConfig({

        // Metadata.
        pkg: grunt.file.readJSON('package.json'),
        banner: '/*!\n' +
            ' * EELNSS v<%= pkg.version %> by Paweł Cesar Sanjuan Szklarz @PSanjuanSzklarz \n' +
            ' * Copyright <%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
            ' * Licensed under <%= _.pluck(pkg.licenses, "url").join(", ") %>\n' +
            ' */\n\n',
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            gruntfile: {
                src: 'Gruntfile.js'
            },
            src: {
                src: ['eelnss.js']
            },
            test: {
                src: ['test/*.js','test/vendor/tddUtils.js']
            }
        },
        qunit: {
            all: ['test/*.html']
        },
        watch: {
            src: {
                files: '<%= jshint.src.src %>',
                tasks: ['jshint:src','qunit']
            },
            test: {
                files: '<%= jshint.test.src %>',
                tasks: ['jshint:test','qunit']
            }
        },
        connect: {
            devserver: {
                options: {
                    port: 8001,
                    hostname: '*',
                    base: '.'
                }
            }
        }
    });


    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');

    grunt.registerTask('test', ['jshint']);

    // Default task.
    grunt.registerTask('default', [ 'dev']);


    grunt.registerTask('dev', [  'connect:devserver', 'watch']);


};
