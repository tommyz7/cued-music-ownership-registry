pipeline {
    agent any

    environment {
        CI = 'true'
        branch = "${env.BRANCH_NAME}"
        gitCommit = "${env.GIT_COMMIT}"
    }

    stages {
        stage('Run unit & integration tests') {
            steps {
                sh 'docker-compose -f compose/docker-eth-env.yml build'
                sh 'docker-compose -f compose/docker-eth-env.yml run --rm truffle npm run test_local'
                sh 'docker-compose -f compose/docker-eth-env.yml kill ganache-cli'
            }
        }
        stage('Publish to npm') {
            steps {
                sh 'docker-compose -f compose/docker-eth-env.yml build'
                sh 'docker-compose -f compose/docker-eth-env.yml run --rm truffle npm run publish'
                sh 'docker-compose -f compose/docker-eth-env.yml kill ganache-cli'
            }
        }
        stage('Create ganache-cli with deployed contracts') {
            steps {
                // sh 'docker build -t cued-blockchain -f compose/ganache/Dockerfile .'
                echo "Building docker $branch"
                script {
                    image = docker.build("cued-blockchain:$branch-$gitCommit", "compose/ganache/Dockerfile")
                    docker.withRegistry("https://registry.coreum.io/", "docker-registry") {
                        image.push()
                        image.push("$branch")
                    }
                }
            }
        }
    }
}
