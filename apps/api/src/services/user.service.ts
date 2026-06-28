import { userRepository } from '../repositories/user.repository.js';

export const userService = {
  listUsers: () => userRepository.findAll(),
};
