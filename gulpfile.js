const del = require('del');
const gulp = require('gulp');
const plumber = require('gulp-plumber');
const babel = require('gulp-babel');
const eslint = require('gulp-eslint');
const excludeGitIgnore = require('gulp-exclude-gitignore');

require('@babel/register');

gulp.task('lint', () => {
  return gulp.src('app/**/*.js')
    .pipe(plumber())
    .pipe(excludeGitIgnore())
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('clean', () => {
  return del('dist');
});

gulp.task('babel', () => {
  return gulp.src('app/**/*.js')
    .pipe(plumber())
    .pipe(babel())
    .pipe(gulp.dest('dist'));
});

gulp.task('prepare', gulp.series('clean', 'babel'));

gulp.task('default', gulp.series('lint'));
