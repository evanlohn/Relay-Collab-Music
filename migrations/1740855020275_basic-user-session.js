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
      score: { type: 'jsonb', notNull: true }
    });
    pgm.createIndex('users', 'sessionId');

    pgm.createTable('decisions', {
        id: 'id',
        sessionId: {
            type: 'integer',
            notNull: true,
            references: '"sessions"',
            onDelete: 'cascade',
        },
        chooserId: {
            type: 'integer',
            notNull: true,
            references: '"users"',
            onDelete: 'cascade',
        },
        otherUserId: {
            type: 'integer',
            notNull: true,
            references: '"users"',
            onDelete: 'cascade',      
        },
        choiceOptions: { type: 'jsonb', notNull: true },
        choiceIndex: 'integer',      
        rerolls: { type: 'jsonb', notNull: false },
        decisionMadeAt: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'), // Automatically set to the current timestamp
        },
    });
    pgm.createIndex('decisions', 'sessionId');
    pgm.createIndex('decisions', 'chooserId');
    pgm.createIndex('decisions', 'otherUserId');
  };
/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    // pgm.dropTable('decisions');
    pgm.dropTable('users');
    pgm.dropTable('sessions');

};
