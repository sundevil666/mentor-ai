import { statisticsRepository } from '../repositories/statistics.repository.js';

export const statisticsService = {
  listStatistics: () => statisticsRepository.findAll(),
};
