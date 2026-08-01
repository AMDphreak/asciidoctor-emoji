export default [
  {
    input: 'src/index.js',
    output: {
      file: 'build/node/index.cjs',
      format: 'cjs',
      exports: 'named',
    },
  },
  {
    input: 'src/index.js',
    output: {
      file: 'build/browser/index.js',
      format: 'esm',
    },
  },
  {
    input: 'src/index.js',
    output: {
      file: 'build/browser/index.global.js',
      format: 'umd',
      name: 'AsciidoctorEmoji',
      exports: 'named',
    },
  },
]
