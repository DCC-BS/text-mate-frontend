import { popover } from "#build/ui";
import type { Driver, DriveStep } from "driver.js";

type OnboardingPhase<Phases> = {
    name: Phases,
    begin?: () => Promise<void>,
    end?: () => Promise<void>
}

type OnboadingStepBuilder<Phases> = {
    addSteps: (steps: DriveStep[]) => OnboadingStepBuilder<Phases>;
    switchPhase: (phase: Phases) => OnboadingStepBuilder<Phases>;
    currentPhase: undefined | OnboardingPhase<Phases>;
    buildDriver: () => Driver;
}

export function useOnboardingBuilder() {
    const { createDriver } = useDriverFactory();

    function addPhases<Phases>(phases: OnboardingPhase<Phases>[]): OnboadingStepBuilder<Phases> {
        const phaseMap = phases.reduce((map, x) => map.set(x.name, x), new Map<Phases, OnboardingPhase<Phases>>)
        return onboadingStepBuilder<Phases>(phaseMap);
    }

    function onboadingStepBuilder<Phases>(
        phaseMap: Map<Phases, OnboardingPhase<Phases>>,
        steps = [] as DriveStep[],
        currentPhase: OnboardingPhase<Phases> | undefined = undefined,
        prevPhase: undefined | OnboardingPhase<Phases> = undefined,

    ): OnboadingStepBuilder<Phases> {
        function addSteps(steps: DriveStep[]) {
            if (prevPhase) {
                const step = steps[0];

                if (step) {
                    const pp = prevPhase;
                    step.popover = {
                        ...popover,
                        onPrevClick: async () => {
                            if (currentPhase?.end) {
                                await currentPhase?.end();
                            }

                            if (pp.begin) {
                                await pp.begin();
                            }
                        }
                    }

                    prevPhase = undefined;
                }
            }

            return onboadingStepBuilder(phaseMap, steps.concat(steps), currentPhase, prevPhase);
        }

        function switchPhase(phase: Phases) {
            const currentStep = steps.at(-1);
            const newPhase = phaseMap.get(phase);

            if (currentStep && newPhase && newPhase !== currentPhase) {
                currentStep.popover = {
                    ...popover,
                    onNextClick: async() => {
                        if (currentPhase && currentPhase.end) {
                            await currentPhase.end();
                        }

                        if (newPhase.begin) {
                            await newPhase.begin();
                        }
                    }
                }
            }

            // current phase is newPhase, prevPhase is currentPhase
            return onboadingStepBuilder(phaseMap, steps, newPhase, currentPhase);
        }

        function buildDriver() {
            return createDriver(steps);
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
