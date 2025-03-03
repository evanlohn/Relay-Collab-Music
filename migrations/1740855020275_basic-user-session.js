/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable('sessions', {
    id: 'id', // Assuming this is an auto-incrementing primary key
    body: { type: 'jsonb', notNull: true },
    createdAt: {
        type: 'timestamp',
        notNull: true,
        default: pgm.func('current_timestamp'), // Automatically set to the current timestamp
    },
    startedAt: { // New timestamp for when the session starts
        type: 'timestamp',
        notNull: false,   // Allow NULL values initially
    }
  });
  pgm.createTable('users', {
      id: 'id',
      name: { type: 'varchar(1000)', notNull: true },
      clef: { 
        type: 'varchar(10)', 
        notNull: true,
        check: "clef IN ('treble', 'bass', 'alto')"
      },
      isHost: { type: 'boolean', notNull: true},
      sessionId: {
        type: 'integer',
        notNull: true,
        references: '"sessions"',
        onDelete: 'cascade',
      },
      createdAt: {
        type: 'timestamp',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    });
    pgm.createIndex('users', 'sessionId');
  };
/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropTable('users');
    pgm.dropTable('sessions');
};
