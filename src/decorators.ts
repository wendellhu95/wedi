import { Ctor, DependencyKey, Identifier } from './typings';
import { dependencyIds, setDependencies } from './utils';

function getDecoratorMisUsedError(
  targetName: string,
  identifierName: string
): Error {
  return new Error(
    '[WeDI] dependency identifier can only be decorated on a constructor parameter. ' +
      `Check ${identifierName} decorated on ${targetName}.`
  );
}

export function createIdentifier<T>(name: string): Identifier<T> {
  if (dependencyIds.has(name)) {
    console.warn(`[DI] duplicated identifier name ${name}.`);

    return dependencyIds.get(name)!;
  }

  const id = function(target: Ctor<T>, _key: string, index: number): void {
    if (arguments.length !== 3) {
      throw getDecoratorMisUsedError(target.name, name);
    }

    setDependencies(target, id, index, false);
  } as any;

  id.toString = () => name;
  id.$$identifier = true;

  dependencyIds.set(name, id);

  return id;
}

/**
 * Wrap a Identifier with this function to make it optional.
 */
export function Optional<T>(key: DependencyKey<T>) {
  return function(target: Ctor<T>, _key: string, index: number) {
    if (arguments.length !== 3) {
      throw getDecoratorMisUsedError(target.name, key.toString());
    }

    setDependencies(target, key, index, true);
  };
}

/**
 * Used inside constructor for services to claim dependencies.
 */
export function Need<T>(key: DependencyKey<T>) {
  return function<C>(target: Ctor<C>, _key: string, index: number) {
    if (arguments.length !== 3) {
      throw getDecoratorMisUsedError(target.name, key.constructor.name);
    }

    setDependencies(target, key, index, false);
  };
}
