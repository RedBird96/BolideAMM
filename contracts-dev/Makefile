#! /usr/bin/make -f

-include .env

SHELL=/bin/bash


save-strategy-version: version ?= -
save-strategy-version: current_version := $(if $(version:-=),$(version),$(CONTRACT_VERSION))
save-strategy-version:
ifeq ($(wildcard ./contracts/strategy_$(strategy)/),)
	@echo "Strategy $(strategy) does not exists"
	@exit 1;
endif

ifeq ($(wildcard ./scripts-hardhat/deploy_$(strategy).ts),)
	@echo "Strategy migration $(strategy) does not exists"
	@exit 2;
endif

ifeq ($(wildcard ./versions/$(strategy)/$(current_version)/),)
	@echo "$(strategy) $(current_version) version exists"
	@exit 3;
endif

	@echo "- Create strategy $(strategy) version: $(current_version)"
	@mkdir -p versions/$(strategy)/$(current_version)

	@echo "- Copy contracts to versions/$(strategy)/$(current_version)/contracts/"
	@mkdir -p versions/$(strategy)/$(current_version)/contracts
	@mkdir -p versions/$(strategy)/$(current_version)/contracts/strategy_$(strategy)
	@mkdir -p versions/$(strategy)/$(current_version)/contracts/utils
	@mkdir -p versions/$(strategy)/$(current_version)/contracts/interfaces
	@mkdir -p versions/$(strategy)/$(current_version)/migrations
	@cp -R ./contracts/strategy_$(strategy)/ versions/$(strategy)/$(current_version)/contracts/strategy_$(strategy)
	@cp -R ./contracts/Logic.sol versions/$(strategy)/$(current_version)/contracts/Logic.sol
	@cp -R ./contracts/utils/ versions/$(strategy)/$(current_version)/contracts/utils/
	@cp -R ./contracts/interfaces/ versions/$(strategy)/$(current_version)/contracts/interfaces/

	@echo "- Copy migration to versions/$(strategy)/$(current_version)/migrations/"
	@cp ./scripts-hardhat/deploy_$(strategy).ts versions/$(strategy)/$(current_version)/migrations/
	@sed -i '' 's/const version = .*;/const version = "$(current_version)";/g' versions/$(strategy)/$(current_version)/migrations/deploy_$(strategy).ts

	@echo "- Making changes.md. Please fill it up"
	@touch versions/$(strategy)/$(current_version)/changes.md


save-multilogic-version: version ?= -
save-multilogic-version: current_version := $(if $(version:-=),$(version),$(CONTRACT_VERSION))
save-multilogic-version:
ifeq ($(wildcard ./scripts-hardhat/deploy_multilogic.ts),)
	@echo "Multilogic migration does not exists"
	@exit 4;
endif

ifeq ($(wildcard ./versions/multilogic/$(current_version)/),)
	@echo "Multilogic $(current_version) version exists"
	@exit 5;
endif

	@echo "- Create multilogic version: $(current_version)"
	@mkdir -p versions/multilogic/$(current_version)

	@echo "- Copy contracts to versions/multilogic/$(current_version)/contracts/"
	@mkdir -p versions/multilogic/$(current_version)/contracts
	@mkdir -p versions/multilogic/$(current_version)/contracts/utils
	@mkdir -p versions/multilogic/$(current_version)/contracts/interfaces
	@mkdir -p versions/multilogic/$(current_version)/migrations
	@cp -R ./contracts/*.sol versions/multilogic/$(current_version)/contracts/
	@cp -R ./contracts/utils/ versions/multilogic/$(current_version)/contracts/utils/
	@cp -R ./contracts/interfaces/ versions/multilogic/$(current_version)/contracts/interfaces/

	@echo "- Copy migration to versions/multilogic/$(current_version)/migrations/"
	@cp ./scripts-hardhat/deploy_multilogic.ts versions/multilogic/$(current_version)/migrations/
	@sed -i '' 's/const version = .*;/const version = "$(current_version)";/g' versions/multilogic/$(current_version)/migrations/deploy_multilogic.ts

	@echo "- Making changes.md. Please fill it up"
	@touch versions/multilogic/$(current_version)/changes.md


restore-artifacts: env ?= -
restore-artifacts: purpose ?= -
restore-artifacts: current_env := $(if $(env:-=),$(env),$(CONTRACT_ENV))
restore-artifacts: current_purpose := $(if $(purpose:-=),$(purpose),$(CONTRACT_PURPOSE))
restore-artifacts:
	@rm -Rf .openzeppelin
	@cp -R ./contract_artifacts/$(current_env)/$(current_purpose)/openzeppelin/ .openzeppelin


save-artifacts: env ?= -
save-artifacts: purpose ?= -
save-artifacts: current_env = $(if $(env:-=),$(env),$(CONTRACT_ENV))
save-artifacts: current_purpose = $(if $(purpose:-=),$(purpose),$(CONTRACT_PURPOSE))
save-artifacts:
ifeq ($(wildcard ./contract_artifacts/$(current_env)/$(current_purpose)/),)
	@echo "Artifacts does not exists"
	@exit 6;
endif
	@cp -R .openzeppelin/* ./contract_artifacts/$(current_env)/$(current_purpose)/openzeppelin
