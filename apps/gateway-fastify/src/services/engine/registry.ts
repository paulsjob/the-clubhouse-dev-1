
import { FunctionDescriptorV1 } from '@renderless/contracts';

export const functionRegistry: FunctionDescriptorV1[] = [
  {
    id: 'passthrough',
    name: 'Passthrough',
    description: 'Returns the input data unchanged.',
    inputs: ['in'],
    outputs: ['out'],
    category: 'logic'
  },
  {
    id: 'map',
    name: 'Map Field',
    description: 'Maps a specific field from input to output.',
    inputs: ['in'],
    outputs: ['out'],
    category: 'transform'
  },
  {
    id: 'add',
    name: 'Add Numbers',
    description: 'Adds two numeric inputs.',
    inputs: ['a', 'b'],
    outputs: ['sum'],
    category: 'math'
  },
  {
    id: 'formatScorebug',
    name: 'Format Scorebug',
    description: 'Formats game data into a stable scorebug object.',
    inputs: ['gameData'],
    outputs: ['scorebug'],
    category: 'domain'
  }
];

export const mockFunctions: Record<string, (inputs: any, config: any) => any> = {
  passthrough: (inputs) => ({ out: inputs.in }),
  map: (inputs, config) => {
    const val = inputs.in?.[config.from];
    return { out: { [config.to]: val } };
  },
  add: (inputs) => ({ sum: (Number(inputs.a) || 0) + (Number(inputs.b) || 0) }),
  formatScorebug: (inputs) => ({
    scorebug: {
      home: inputs.gameData?.home || { score: 0, name: 'TBD' },
      away: inputs.gameData?.away || { score: 0, name: 'TBD' },
      clock: inputs.gameData?.clock || '00:00'
    }
  })
};
