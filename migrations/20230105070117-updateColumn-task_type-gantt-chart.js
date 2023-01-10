'use strict';

/** NOTE : This migration was created because earlier task_type data has type ENUM due to which data insert was giving errors sometimes, 
 * now its type is changed to STRING
  */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
      queryInterface.changeColumn('gantt_chart', 'task_type', {
          type : Sequelize.STRING 
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
