'use strict';

/** NOTE : This migration is created because if we upload diff snapshot of same project then the assignees row were duplicates because
 * new project snapshot will also have same assignee as in prev snapshot. So to avoid duplicate entry I've created uniqueness based on two colums. 
  */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
      queryInterface.addIndex('user_mapping', ['user_id', 'user_project_id'], {
          name : 'unique_user_id_and_user_project_id',
          unique : true
      });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
