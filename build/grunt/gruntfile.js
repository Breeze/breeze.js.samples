module.exports = function(grunt) {

  var path = require('path');
  
  var msBuild = 'C:/Windows/Microsoft.NET/Framework/v4.0.30319/MSBuild.exe ';
  var msBuildOptions = ' /p:Configuration=Release /verbosity:minimal ';
  
  var breezeJsDir = '../../../Breeze.js/';
  
  var jsBuildDir  = breezeJsDir + 'build/';
  var jsSrcDir    = breezeJsDir + 'src/';
  var tsSrcDir    = breezeJsDir + 'typescript/typescript';
  var qDir        = breezeJsDir + 'test/vendor/';
  var metadataDir = breezeJsDir + 'docs/metadata/';
  
  var serverNetDir = '../../../Breeze.server.net/';
  
  var tempDir = '../_temp/';
  
  var tempPaths = [
     'bin','obj', 'packages','*_Resharper*','*.suo','*.temp.*'
  ];
  
  var nugetPackageNames = [
     'Breeze.WebApi', 
	   'Breeze.WebApi2.EF6',
     'Breeze.WebApi2.NH',
	   'Breeze.Client',
	   'Breeze.Server.WebApi2',
     'Breeze.Server.ContextProvider.EF6',
     'Breeze.Server.ContextProvider.NH',
     'Breeze.Server.ContextProvider'
	];
  
  var breezeDlls = [
    'Breeze.WebApi', 
    'Breeze.WebApi.EF', 
    'Breeze.WebApi.NH',
    'Breeze.ContextProvider', 
    'Breeze.ContextProvider.EF6',
    'Breeze.ContextProvider.NH',
    'Breeze.WebApi2'
  ];
  
  var sampleSolutionFileNames = grunt.file.expand('../../**/*.sln');
  
  var sampleDirs = grunt.file.expand(['../../net/*/', '../../no-server/*/', '../../node/*/']);
 
  var versionNum = getBreezeVersion();
  var zipFileName = '../breeze-runtime-' + versionNum + '.zip';
  var zipPlusFileName = '../breeze-runtime-plus-' + versionNum + '.zip';

  grunt.log.writeln('zipName: ' + zipPlusFileName);
  grunt.file.write(tempDir + 'version.txt', 'Version: ' + versionNum);
  grunt.log.writeln('localAppData: ' + process.env.LOCALAPPDATA);
  grunt.log.writeln('SolutionFileNames ');
  grunt.log.writeln('----------------- ');
  sampleSolutionFileNames.forEach(function(fn) {
     grunt.log.writeln( '    ' + fn);
  });
    
	 
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    nugetSolutionUpdate: {
      samples: {
        solutionFileNames: sampleSolutionFileNames
      }
    },
    
    clean: {
      options: {
        // uncomment to test
        // "no-write": true,
        force: true,
      },
      tempDir: tempDir,
      samples:  join( ['../../**/'], tempPaths),
    },
    
	  msBuild: {
      samples: {
        msBuildOptions: msBuildOptions,
        solutionFileNames: sampleSolutionFileNames,
      },
    },
    
    copy: {
      jsClient: {
        files: [ 
          { expand: true, cwd: jsBuildDir, src: ['breeze*.js'], dest: tempDir + 'Scripts'},
          { expand: true, cwd: jsSrcDir, src: ['b??_breeze.**js'], dest: tempDir + 'Scripts/Adapters/', 
            rename: function(dest, src) {
              return dest + 'breeze' + src.substring(src.indexOf('.'));
            }
          },
          { expand: true, cwd: qDir , src: ['q.**js'], dest: tempDir + 'Scripts' },
          { expand: true, cwd: tsSrcDir, src: ['*.d.ts'], dest: tempDir + 'Typescript'},
          { expand: true, cwd: metadataDir, src: ['*.*'], dest: tempDir + 'Scripts/Metadata' },
        ]
      },
      netDlls: {
        files: breezeDlls.map(function(dllName) {
           return buildDllCopyCmd(dllName);
        })
      },  
      
      samples: {
        files: sampleDirs.map(function(dir) {
            return buildSampleCopyCmd(dir, tempDir);
          })
      },
      
      readMe: {
        files: [{ expand: true, src: ['readme.txt'], dest: tempDir }],
      }
    },
    
    compress: {
      base: {
        options: { archive:  zipFileName, mode: 'zip', level: 9 },
        files: [ 
          { expand: true, cwd: tempDir, src: [ '**/**', '!Samples/**/*' ], dest: '/' } 
        ]
      },
      baseWithSamples: {
        options: { archive:  zipPlusFileName, mode: 'zip', level: 9  },
        files: [ 
          { expand: true, dot: true, cwd: tempDir, src: [ '**/*' ], dest: '/' } 
        ]
      }
    },
   
  });


  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-compress');
  
  grunt.registerMultiTask('nugetSolutionUpdate', 'nuget update', function( ) {   
    // dynamically build the exec tasks
    var that = this;
    
    this.data.solutionFileNames.forEach(function(solutionFileName) {
      execNugetInstall(solutionFileName, that.data);
      execNugetUpdate(solutionFileName, nugetPackageNames, that.data);
    });
  });
   
  grunt.registerMultiTask('msBuild', 'Execute MsBuild', function( ) {
    // dynamically build the exec tasks
    grunt.log.writeln('msBuildOptions: ' + this.data.msBuildOptions);
    var that = this;
    
    this.data.solutionFileNames.forEach(function(solutionFileName) {
      execMsBuild(solutionFileName, that.data);
    });
    
  });  
  
 
  // for debugging file patterns
  grunt.registerMultiTask('listFiles', 'List files', function() {
    grunt.log.writeln('target: ' + this.target);
    
    this.files.forEach(function(fileGroup) {
      fileGroup.src.forEach(function(fileName) {
        grunt.log.writeln('file: ' + fileName);
      });
    });
  });

  grunt.registerTask('buildRelease', 
   [ 'nugetSolutionUpdate:samples', 'msBuild:samples']);
  grunt.registerTask('packageRelease', 
   [ 'clean', 'copy', 'compress']);    
    
  grunt.registerTask('default', ['buildRelease', 'packageRelease']);
    
  function getBreezeVersion() {
     var versionFile = grunt.file.read( jsSrcDir + '_head.jsfrag');    
     var regex = /\s+version:\s*"(\d.\d\d*.?\d*)"/
     var matches = regex.exec(versionFile);
     
     if (matches == null) {
        throw new Error('Version number not found');
     }
     // matches[0] is entire version string - [1] is just the capturing group.
     var versionNum = matches[1];
     grunt.log.writeln('version: ' + versionNum);
     return versionNum;
  }
  
  function join(a1, a2) {
    var result = [];
    a1.forEach(function(a1Item) {
      a2.forEach(function(a2Item) {
        result.push(a1Item + '**/' + a2Item);
      });
    });
    return result;
  }
  
 
  function buildSampleCopyCmd(srcRoot, destRoot) {
    // var baseName = path.basename(srcRoot);
    var destPath = path.relative('../../', srcRoot);
    var files = ['**/*', '**/.nuget/*'];

    var cmd = { 
      expand: true, 
      cwd: srcRoot , 
      src: files,
      dest: destRoot + "Samples/" + destPath,
    }
    return cmd;
  }
  
  function buildDllCopyCmd(dllName) {

    var cmd = { 
      expand: true, 
      cwd: serverNetDir + dllName,
      src: [ dllName + '.dll' ],
      dest: tempDir + 'NetDlls',
    }
    return cmd;
  }
   
  
  function execNugetInstall(solutionFileName, config ) {
    
    var solutionDir = path.dirname(solutionFileName);
    var packagesDir = solutionDir + '/packages';

    var configFileNames = grunt.file.expand(solutionDir + '/**/packages.config');
    configFileNames.forEach(function(fn) {
      grunt.log.writeln('Preparing nuget install for file: ' + fn);
      var cmd = 'nuget install ' + fn + ' -OutputDirectory ' + packagesDir;
      // grunt.log.writeln('cmd: ' + cmd);
      runExec('nugetInstall', {
        cmd: cmd
      });
    });
  }
  
  function execNugetUpdate(solutionFileName, nugetPackageNames, config) {
    var baseCmd = 'nuget update ' + solutionFileName +  ' -FileConflictAction Ignore -Id ';
    
    nugetPackageNames.forEach(function(npn) {
      grunt.log.writeln('cmd: ' + baseCmd + npn);
      runExec('nugetUpdate', {
        cmd: baseCmd + npn
      });
    });
  }

  function execMsBuild(solutionFileName, config ) {
    grunt.log.writeln('Executing solution build for: ' + solutionFileName);
    
    var cwd = path.dirname(solutionFileName);
    var baseName = path.basename(solutionFileName);
    var rootCmd = msBuild + '"' + baseName +'"' + config.msBuildOptions + ' /t:' 
    
    runExec('msBuildClean', {
      cwd: cwd,
      cmd: rootCmd + 'Clean'
    });
    runExec('msBuildRebuild', {
      cwd: cwd,
      cmd: rootCmd + 'Rebuild'
    });

  }
  
  var index = 0;
  
  function runExec(name, config) {
    var name = name+'-'+index++;
    grunt.config('exec.' + name, config);
    grunt.task.run('exec:' + name);
  }
  
  function log(err, stdout, stderr, cb) {
    if (err) {
      grunt.log.write(err);
      grunt.log.write(stderr);
      throw new Error("Failed");
    }

    grunt.log.write(stdout);

    cb();
  }


};