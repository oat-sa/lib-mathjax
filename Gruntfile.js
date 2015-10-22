module.exports = function(grunt) {
  'use strict';

    var deps = [];
    grunt.file.expand({cwd: 'wrapped'},  [
        'config/*.js',
        'extensions/**/*.js',
        'localization/en/*.js',
        'jax/element/**/*.js',
        'jax/input/**/*.js',
        'jax/output/HTML-CSS/*.js',
        'jax/output/HTML-CSS/autoload/*.js',
        'jax/output/HTML-CSS/fonts/TeX/**/*.js',
        'jax/output/HTML-CSS/fonts/STIX/**/*.js',
        'jax/output/HTML-CSS/fonts/STIX-Web/**/*.js',
        '!jax/output/HTML-CSS/fonts/TeX/WinIE6/Regular/*.js',
        'jax/output/NativeMML/**/*.js',
        'jax/output/CommonHTML/**/*.js',
    ]).forEach(function(source, index) {
        if(!/WinIE6/.test(source)){
            grunt.log.debug(source);
            deps.push('MathJax/' + source.replace(/\.js$/, ''));
        }
    });



    // Project configuration.
    grunt.initConfig({
        clean : {
           dist : ['dist/*', 'wrapped/']
        },

        wrap : {
            amd : {
                files : [{
                    expand : true,
                    cwd : 'unpacked/',
                    src : ['config/*.js', 'extensions/**/*.js', 'jax/**/*.js', 'localization/**/*.js'],
                    dest: 'wrapped/'
                }],
                options : {
                    wrapper : ['define(function(){\n  return function(MathJax){\n','  };\n});']
                }
            }
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
                    "MathJax" : "wrapped"
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
            amd : {
                src : 'unpacked/MathJax.amd.js',
                dest : 'wrapped/MathJax.js'
            },
            assets : {
                files : [
                    {
                        expand: true,
                        src: [
                            'fonts/HTML-CSS/TeX/**/*',
                            'fonts/HTML-CSS/STIX-Web/**/*',
                            '!fonts/HTML-CSS/TeX/png/**/*',
                            '!fonts/HTML-CSS/TeX/otf/**/*',
                            '!fonts/HTML-CSS/STIX-Web/png/**/*',
                            '!fonts/HTML-CSS/STIX-Web/otf/**/*'
                        ],
                        dest: 'dist/'
                    }
                ]
           }
        }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-wrap');


  grunt.registerTask('amdify', "Amdify sources", ['clean', 'wrap:amd', 'copy:amd']);
  grunt.registerTask('preview', "Compiled dist but not optimized", ['amdify', 'requirejs:dev', 'copy:assets']);
  grunt.registerTask('build', "Bundle MathJax distribution", ['amdify', 'requirejs:dist', 'copy:assets']);
};
