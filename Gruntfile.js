module.exports = function(grunt) {
  'use strict';

    var deps = [];
    grunt.file.expand({cwd: 'unpacked'},  [
        'config/*.js',
        'extensions/**/*.js',
        'localization/en/*.js',
        'jax/element/**/*.js',
        'jax/input/**/*.js',
        'jax/output/HTML-CSS/*.js',
        'jax/output/HTML-CSS/autoload/*.js',
        'jax/output/HTML-CSS/fonts/TeX/**/*.js',
        '!jax/output/HTML-CSS/fonts/TeX/WinIE6/Regular/*.js',
        'jax/output/NativeMML/**/*.js',
    ]).forEach(function(source, index) {
        if(!/WinIE6/.test(source)){
            grunt.log.debug(source);
            deps.push('MathJax/' + source.replace(/\.js$/, ''));
        }
    });

    // Project configuration.
    grunt.initConfig({
        clean : {
           dist : ['dist/*']
        },
        requirejs: {
            options: {
                baseUrl: ".",
                preserveLicenseComments: false,
                optimizeAllPluginResources: true,
                findNestedDependencies : true,
                skipDirOptimize: true,
                optimizeCss : 'none',
                buildCss : false,
                inlineText: true,
                skipPragmas : true,
                generateSourceMaps : false,
                removeCombined : true,
                wrap : {
                    start : '',
                    end : "define(['MathJax/MathJax', 'module'], function(MathJax, module){" +
                            "MathJax.Hub.Config(module.config());" +
                            "MathJax.Hub.Configured();" +
                            "return MathJax;" +
                          "});"
                },
                paths: {
                    "MathJax" : "unpacked"
                },
                deps : deps,
                name: "MathJax/MathJax",
                //insertRequire: ['MathJax/MathJax'],
                out: "dist/MathJax.min.js"
            },
            dev: {
                options: {
                    optimize : 'none',
                }
            },
            dist: {
                options: {
                    optimize: 'uglify2',
                    uglify2: {
                        //mangle : false,
                        output: {
                            'max_line_len': 2048
                        }
                    }
                }
            }
        },
        copy : {
           dist : {
                files : [
                    {expand: true, src: ['fonts/HTML-CSS/TeX/**/*', '!fonts/HTML-CSS/TeX/png/**/*', '!fonts/HTML-CSS/TeX/otf/**/*'], dest: 'dist/'},
                ]
           }
        },
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-requirejs');


  grunt.registerTask('preview', "Compiled dist but not optimized", ['clean', 'requirejs:dev', 'copy']);
  grunt.registerTask('build', "Bundle MathJax distribution", ['clean', 'requirejs:dist', 'copy']);
};
