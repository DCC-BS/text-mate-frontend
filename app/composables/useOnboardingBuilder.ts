import type { Config, Driver, DriveStep } from "driver.js";

type OnboardingPhase<Phases> = {
    name: Phases,
    onEnter?: () => Promise<void>,
    onExit?: () => Promise<void>,
}

type OnboadingStepBuilder<Phases> = {
    addSteps: (steps: DriveStep[]) => OnboadingStepBuilder<Phases>;
    switchPhase: (phase: Phases) => OnboadingStepBuilder<Phases>;
    currentPhase: undefined | OnboardingPhase<Phases>;
    buildDriver: () => Driver;
}

interface State {
    name: "Initial" | "PhaseSwitched" | "StepsAdded";
}

class Initial {
    name = "Initial" as const;
}

class PhaseSwitched<Phases> implements State {
    name = "PhaseSwitched" as const;

    constructor(
        public readonly newPhase?: OnboardingPhase<Phases>,
        public readonly oldPhase?: OnboardingPhase<Phases>,
    ) {}
}

class StepsAdded implements State {
    name = "StepsAdded" as const;

    constructor(public readonly newSteps: DriveStep[]) { }
}


export function useOnboardingBuilder(config?: Config) {
    const { createDriver } = useDriverFactory();
    const additionalConfig = { ...config };

    function addPhases<Phases>(phases: OnboardingPhase<Phases>[]): OnboadingStepBuilder<Phases> {
        const phaseMap = phases.reduce((map, x) => map.set(x.name, x), new Map<Phases, OnboardingPhase<Phases>>)
        return onboadingStepBuilder<Phases>(phaseMap);
    }

    function onboadingStepBuilder<Phases>(
        phaseMap: Map<Phases, OnboardingPhase<Phases>>,
        steps = [] as DriveStep[],
        currentPhase: OnboardingPhase<Phases> | undefined = undefined,
        state: State = new Initial()
    ): OnboadingStepBuilder<Phases> {
        function addSteps(newSteps: DriveStep[]) {
            if (!newSteps.length) {
                throw new Error("steps cannot be empty");
            }

            if (state instanceof PhaseSwitched) {
                const step = newSteps[0];

                if (step) {
                    const oldPhase = state.oldPhase;
                    step.popover = {
                        ...step.popover,
                        onPrevClick: async (_, __, { driver }) => {
                            if (currentPhase?.onExit) {
                                await currentPhase?.onExit();
                            }

                            if (oldPhase?.onEnter) {
                                await oldPhase.onEnter();
                            }

                            driver.movePrevious();
                        }
                    }
                }
            }

            const newState = new StepsAdded(steps);
            return onboadingStepBuilder(phaseMap, steps.concat(newSteps), currentPhase, newState);
        }

        function switchPhase(phase: Phases) {
            const currentStep = steps.at(-1);
            const newPhase = phaseMap.get(phase);

            // if the switch is an initial switch before any steps.
            if (steps.length === 0 && newPhase && newPhase.onEnter) {
                const onEnter = newPhase.onEnter;
                additionalConfig.onHighlightStarted = async (_, __, { state }) => {
                    if (!state.previousStep) {
                        await onEnter();
                    }
                }
            }
            else if (currentStep && newPhase && newPhase !== currentPhase) {
                currentStep.popover = {
                    ...currentStep.popover,
                    onNextClick: async(_, __, { driver }) => {
                        if (currentPhase?.onExit) {
                            await currentPhase.onExit();
                        }

                        if (newPhase.onEnter) {
                            await newPhase.onEnter();
                        }

                        driver.moveNext();
                    }
                }
            }

            const newState = new PhaseSwitched(newPhase, currentPhase);
            return onboadingStepBuilder(phaseMap, steps, newPhase, newState);
        }

        function buildDriver() {
            return createDriver(steps, config);
        }

        return {
            addSteps,
            switchPhase,
            currentPhase,
            buildDriver
        }
    }

    return {
        addPhases
    }
}
