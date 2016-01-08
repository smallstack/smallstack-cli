module.exports = function (grunt) {

  grunt.config.merge({
    pkg: grunt.file.readJSON('package.json'),
    typedoc: {
      project: {
        options: {
          module: 'commonjs',
          out: './docs',
          name: '<%%= pkg.name %> v<%%= pkg.version %>',
          target: 'es5'
        },
        src: ['./app/packages/**/*.ts']
      }
    }
  });

}